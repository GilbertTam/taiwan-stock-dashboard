"""台股月營收 API(mounted under /api/revenue)。

  GET  /revenue/monthly      — 月營收列表(篩選/排序);year_month 預設最新月
  GET  /revenue/months       — 可選年月清單(新到舊)
  GET  /revenue/industries   — 產業別清單
  POST /revenue/sync         — 手動觸發抓取入庫(管理/測試)
"""
from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas.revenue import (
    IndustriesResponse,
    MonthsResponse,
    RevenueHistoryResponse,
    RevenueListResponse,
    RevenueSyncResult,
)
from app.services import revenue_service

router = APIRouter()


@router.get("/monthly", response_model=RevenueListResponse)
async def monthly(
    market: str = Query("all", pattern="^(all|twse|tpex)$"),
    year_month: Optional[str] = Query(None, description="YYYY-MM;預設最新月"),
    industry: Optional[str] = Query(None),
    min_yoy: Optional[float] = Query(None, description="YoY% 下限"),
    min_mom: Optional[float] = Query(None, description="MoM% 下限"),
    new_only: bool = Query(False, description="僅今日新申報"),
    query: Optional[str] = Query(None, description="代號或名稱關鍵字"),
    sort: str = Query("first_seen", pattern="^(first_seen|yoy|mom|revenue|code)$"),
    db: AsyncSession = Depends(get_db),
) -> Any:
    return await revenue_service.list_revenue(
        db, market=market, year_month=year_month, industry=industry,
        min_yoy=min_yoy, min_mom=min_mom, new_only=new_only, query=query, sort=sort,
    )


@router.get("/history/{code}", response_model=RevenueHistoryResponse)
async def history(code: str, db: AsyncSession = Depends(get_db)) -> Any:
    """單一公司歷史月營收(直方圖 + 歷史表)。"""
    return await revenue_service.get_history(db, code)


@router.get("/months", response_model=MonthsResponse)
async def months(db: AsyncSession = Depends(get_db)) -> Any:
    return await revenue_service.list_months(db)


@router.get("/industries", response_model=IndustriesResponse)
async def industries(
    year_month: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
) -> Any:
    return await revenue_service.list_industries(db, year_month=year_month)


@router.post("/sync", response_model=RevenueSyncResult)
async def sync() -> Any:
    """手動抓取入庫。平時由 scheduler 在公告期自動跑。"""
    return await revenue_service.sync_monthly_revenue()


@router.post("/backfill")
async def backfill(months: int = Query(24, ge=1, le=60)) -> Any:
    """一次性回填過去 N 個月歷史月營收(MOPS),供歷史直方圖。重量級,管理用。"""
    return await revenue_service.backfill_history(months=months)
