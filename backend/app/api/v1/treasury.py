"""台股庫藏股 API(mounted under /api/treasury)。

  GET  /treasury/list   — 庫藏股列表(狀態/市場/搜尋篩選);status 預設 active(執行中+新公告)
  POST /treasury/sync   — 手動觸發抓取入庫(管理/測試)
"""
from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas.treasury import TreasuryListResponse, TreasurySyncResult
from app.services import treasury_service

router = APIRouter()


@router.get("/list", response_model=TreasuryListResponse)
async def list_treasury(
    status: str = Query("active", pattern="^(active|executing|new|done|all)$"),
    market: str = Query("all", pattern="^(all|twse|tpex)$"),
    query: Optional[str] = Query(None, description="代號或名稱關鍵字"),
    sort: str = Query("board_date", pattern="^(board_date|first_seen|code)$"),
    db: AsyncSession = Depends(get_db),
) -> Any:
    return await treasury_service.list_treasury(
        db, status=status, market=market, query=query, sort=sort,
    )


@router.post("/sync", response_model=TreasurySyncResult)
async def sync() -> Any:
    """手動抓取入庫。平時由 scheduler 每 30 分鐘跑。"""
    return await treasury_service.sync_treasury()
