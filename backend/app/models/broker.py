"""分點券商相關 model — 上承當日漲停（daily）頁面。

三張表（SQLite + PostgreSQL 都吃得進去）：

  stocks
    一檔股票一列，當作 broker_snapshots 的外鍵指向對象。也保留給後續
    其他股票相關 feature（隔日表現、季報、營收…）共用。

  broker_snapshots
    每檔股票每個交易日一份「分點抓取快照」。包含當日 OHLC 摘要、
    抓取狀態（pending/ok/failed）與彙整數量，是 UI 第一次查的入口。

  broker_entries
    一份 snapshot 的多筆分點明細（一個券商一列），存全部分點而非僅
    Top 15，這樣後續做泡泡圖、跨檔分析都拿得到完整資料。
    `rank_in_buy` / `rank_in_sell` 由抓取流程預先寫入，前端 ORDER BY
    這兩個欄位就能直接拿前 15 名。

設計取捨：
  - 不用 ENUM 是因為 SQLite 沒有 native ENUM；用 String + class constants。
  - 金額類欄位用 Numeric(precision, scale) 而非 Float，避免浮點漂移。
  - 用 UniqueConstraint 確保 (stock_id, trade_date) / (snapshot_id, broker_code)
    都是天然主鍵，重抓只會 upsert 不會炸資料。
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db import Base


# ── 狀態常數（替代 ENUM，SQLite 友好） ─────────────────────────
class SnapshotStatus:
    PENDING = "pending"   # 已排入抓取佇列，背景進行中
    OK = "ok"             # 抓取成功，資料已寫入
    FAILED = "failed"     # 抓取失敗（驗證碼耗盡 / 解析錯誤 / 來源無資料）


class Stock(Base):
    """股票主檔。code 是業務主鍵（"2472" 之類），id 是 surrogate。

    這張表會在以下時機自動 upsert 一筆：
      1. broker_service.get_or_create_stock(code, ...) — 抓 broker 時若不存在則建立
      2. 日後若把 daily limit-up 結果寫入 DB，也可以以此為入口表
    """

    __tablename__ = "stocks"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False, default="")
    market = Column(String, nullable=False, default="")  # "twse" / "tpex"

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    broker_snapshots = relationship(
        "BrokerSnapshot",
        back_populates="stock",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class BrokerSnapshot(Base):
    """一檔股票一個交易日的分點抓取快照。"""

    __tablename__ = "broker_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id", ondelete="CASCADE"), nullable=False, index=True)
    trade_date = Column(Date, nullable=False, index=True)

    status = Column(String, nullable=False, default=SnapshotStatus.PENDING)
    fetched_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 抓取時 BSR 也會回傳當日 OHLC，順手存下避免之後再 join 一次
    open = Column(Numeric(10, 2))
    high = Column(Numeric(10, 2))
    low = Column(Numeric(10, 2))
    close = Column(Numeric(10, 2))

    total_records = Column(Integer, nullable=False, default=0)  # 原始明細筆數
    total_brokers = Column(Integer, nullable=False, default=0)  # 涉及券商數

    error = Column(Text)  # status='failed' 時記下原因，供 UI 顯示

    __table_args__ = (
        # 一檔一日唯一 — 天然 idempotency
        UniqueConstraint("stock_id", "trade_date", name="uq_broker_snapshots_stock_date"),
        Index("ix_broker_snapshots_date_desc", "trade_date"),
    )

    stock = relationship("Stock", back_populates="broker_snapshots", lazy="joined")
    entries = relationship(
        "BrokerEntry",
        back_populates="snapshot",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class BrokerEntry(Base):
    """單一分點在某個 snapshot 中的成交彙整。"""

    __tablename__ = "broker_entries"

    id = Column(Integer, primary_key=True, index=True)
    snapshot_id = Column(
        Integer,
        ForeignKey("broker_snapshots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    broker_code = Column(String, nullable=False)  # 例 "9800"
    broker_name = Column(String, nullable=False)  # 例 "元大"

    # 單位：張（bsr_analysis 已將股 / 1000）
    net = Column(Numeric(12, 2), nullable=False, default=0)
    buy = Column(Numeric(12, 2), nullable=False, default=0)
    sell = Column(Numeric(12, 2), nullable=False, default=0)

    buy_avg = Column(Numeric(10, 2))   # 買進加權均價
    sell_avg = Column(Numeric(10, 2))  # 賣出加權均價

    # 預先寫入，前端 ORDER BY rank_in_buy LIMIT 15 即可取買超 Top15
    rank_in_buy = Column(Integer)
    rank_in_sell = Column(Integer)

    __table_args__ = (
        UniqueConstraint("snapshot_id", "broker_code", name="uq_broker_entries_snapshot_broker"),
        Index("ix_broker_entries_buy_rank", "snapshot_id", "rank_in_buy"),
        Index("ix_broker_entries_sell_rank", "snapshot_id", "rank_in_sell"),
    )

    snapshot = relationship("BrokerSnapshot", back_populates="entries")
