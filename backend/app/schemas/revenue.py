"""台股月營收 API schemas — 餵 /dashboard/revenue 頁面。"""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

MarketLiteral = Literal["twse", "tpex"]


class MonthlyRevenueOut(BaseModel):
    """一家公司一個年月的月營收(金額單位:仟元)。"""
    code: str
    name: str = ""
    market: str = ""
    industry: str = ""
    year_month: str                       # "YYYY-MM"
    revenue: Optional[int] = None         # 當月營收
    last_month_revenue: Optional[int] = None
    last_year_revenue: Optional[int] = None
    mom_pct: Optional[float] = None       # 上月比較增減(%)
    yoy_pct: Optional[float] = None       # 去年同月增減(%)
    cum_revenue: Optional[int] = None     # 當月累計營收
    cum_yoy_pct: Optional[float] = None   # 累計前期比較增減(%)
    note: str = ""
    report_date: Optional[str] = None     # 出表日(官方產製日) "YYYY-MM-DD"
    first_seen_at: Optional[datetime] = None
    is_new: bool = False                  # first_seen_at 為今日 → 新申報


class RevenueSummary(BaseModel):
    """列表頂部統計。"""
    latest_year_month: Optional[str] = None
    total: int = 0                # 符合篩選的家數
    new_today: int = 0           # 其中今日新申報
    avg_yoy: Optional[float] = None


class RevenueListResponse(BaseModel):
    """GET /api/revenue/monthly 回傳。"""
    year_month: Optional[str] = None
    summary: RevenueSummary = Field(default_factory=RevenueSummary)
    items: list[MonthlyRevenueOut] = Field(default_factory=list)


class MonthsResponse(BaseModel):
    """GET /api/revenue/months — 可選年月清單(新到舊)。"""
    months: list[str] = Field(default_factory=list)


class IndustriesResponse(BaseModel):
    """GET /api/revenue/industries — 產業別清單。"""
    industries: list[str] = Field(default_factory=list)


class RevenueHistoryPoint(BaseModel):
    """單月歷史點(直方圖/歷史表用)。"""
    year_month: str
    revenue: Optional[int] = None     # 仟元
    mom_pct: Optional[float] = None
    yoy_pct: Optional[float] = None


class RevenueHistoryResponse(BaseModel):
    """GET /api/revenue/history/{code} 回傳。"""
    code: str
    name: str = ""
    market: str = ""
    industry: str = ""
    points: list[RevenueHistoryPoint] = Field(default_factory=list)  # 依年月升冪


class RevenueSyncResult(BaseModel):
    """POST /api/revenue/sync 回傳。"""
    months: list[str] = Field(default_factory=list)
    fetched: int = 0
    inserted: int = 0
    updated: int = 0
    new_today: int = 0
