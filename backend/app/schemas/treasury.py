"""台股庫藏股 API schemas — 餵 /dashboard/repurchase 頁面。"""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

StatusLiteral = Literal["執行中", "新公告", "完成"]


class TreasuryOut(BaseModel):
    """一筆庫藏股買回。"""
    code: str
    name: str = ""
    market: str = ""
    board_date: str                       # 董事會決議日 "YYYY-MM-DD"
    purpose: str = ""
    amount_cap: Optional[int] = None      # 金額上限(元)
    planned_shares: Optional[int] = None  # 預定買回股數(股)
    price_low: Optional[float] = None
    price_high: Optional[float] = None
    period_start: str = ""
    period_end: str = ""
    is_done: bool = False
    bought_shares: Optional[int] = None
    bought_amount: Optional[int] = None
    bought_pct: Optional[float] = None    # 已買回佔預定(%)
    avg_price: Optional[float] = None
    status: StatusLiteral = "執行中"      # 衍生
    is_new: bool = False                  # first_seen 今日
    first_seen_at: Optional[datetime] = None


class TreasurySummary(BaseModel):
    executing: int = 0   # 執行中
    new_today: int = 0   # 新公告(今日)
    done: int = 0        # 完成
    total: int = 0       # 符合篩選的總數


class TreasuryListResponse(BaseModel):
    """GET /api/treasury/list 回傳。"""
    summary: TreasurySummary = Field(default_factory=TreasurySummary)
    items: list[TreasuryOut] = Field(default_factory=list)


class TreasurySyncResult(BaseModel):
    """POST /api/treasury/sync 回傳。"""
    fetched: int = 0
    inserted: int = 0
    updated: int = 0
    new_today: int = 0
