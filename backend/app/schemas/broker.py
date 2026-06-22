"""分點券商 API schemas。

回傳給前端的三狀態結構：
  - status='ok'      → 含 buyTop / sellTop / all 等實際資料
  - status='pending' → 抓取中，前端輪詢
  - status='failed'  → 抓取失敗，附 error；前端顯示重試按鈕
所以欄位用 Optional，讓三狀態共用同一個 response model。
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

Status = Literal["pending", "ok", "failed"]


class BrokerEntryOut(BaseModel):
    """一個分點的買賣超彙整。"""
    broker_code: str
    broker_name: str
    net: float           # 張
    buy: float
    sell: float
    buy_avg: Optional[float] = None
    sell_avg: Optional[float] = None
    rank_in_buy: Optional[int] = None
    rank_in_sell: Optional[int] = None


class BrokerSnapshotResponse(BaseModel):
    """GET /api/stock/daily/brokers/{code}?date=… 回傳結構。"""
    code: str
    name: str = ""
    market: str = ""
    trade_date: Optional[date] = None
    status: Status
    fetched_at: Optional[datetime] = None
    error: Optional[str] = None

    # status='ok' 時填入；其他狀態為 None / 空 list
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None
    total_records: int = 0
    total_brokers: int = 0

    # Top 15 + 全量。前端常用 buyTop / sellTop；想自繪泡泡圖可用 all。
    buyTop: list[BrokerEntryOut] = Field(default_factory=list)
    sellTop: list[BrokerEntryOut] = Field(default_factory=list)
    all: list[BrokerEntryOut] = Field(default_factory=list)


class BrokerBatchCrawlResponse(BaseModel):
    """POST /api/stock/daily/brokers/batch-crawl 回傳。"""
    queued: list[str]      # 新加入佇列的股票代號
    skipped_ok: list[str]  # 今日已有 ok snapshot，沒重抓
    skipped_pending: list[str]  # 已有 pending snapshot，不重複加
    trade_date: date
