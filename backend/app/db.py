from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from typing import AsyncGenerator

from app.config import settings

# Create Async Engine
# check_same_thread=False is needed for SQLite
_is_sqlite = "sqlite" in settings.DATABASE_URL
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,  # Set to True for SQL logging
    connect_args={"check_same_thread": False} if _is_sqlite else {},
    # 緩衝池小一點對 SQLite 沒差,但對未來換 PG 比較友好
    pool_pre_ping=True,
)


# ── SQLite 並發優化 ────────────────────────────────────────────
# 原因:預設 journal_mode=DELETE 寫入時整個 DB 全表鎖,只要兩個 async task
# 同時 commit 就會炸 "database is locked"。broker 抓取會多 task 並行寫,
# 一定要開 WAL。三個 PRAGMA 同時打:
#   journal_mode=WAL    — 讀寫不互鎖,只要不是兩個寫者就 OK
#   synchronous=NORMAL  — 寫入只 fsync WAL,不 fsync 主檔(crash 損失 < 1 commit)
#   busy_timeout=5000   — 真的撞到鎖時等 5 秒而非立刻失敗
if _is_sqlite:
    @event.listens_for(engine.sync_engine, "connect")
    def _set_sqlite_pragmas(dbapi_conn, _connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


# Async Session Factory
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
