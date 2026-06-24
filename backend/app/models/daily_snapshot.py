"""每日漲停 snapshot 表 — 為了支援歷史日期查詢。

設計取捨:
- TWSE/TPEX 全市場 OpenAPI 只回最新交易日,沒有可用的歷史端點
- 因此每日 14:35 由 scheduler 主動 snapshot 當下 limit-up 結果到 DB
- payload 用 TEXT 存整個 DailyLimitUpResponse JSON,讀取時直接還原給前端
  (不切表正規化,因為 90% 用途是「整份回放當日清單」)
- (trade_date) 唯一,當天重抓會 upsert
"""
from __future__ import annotations

from sqlalchemy import Column, Date, DateTime, Integer, Text
from sqlalchemy.sql import func

from app.db import Base


class DailyLimitUpSnapshot(Base):
    __tablename__ = "daily_limit_up_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    trade_date = Column(Date, unique=True, index=True, nullable=False)
    total = Column(Integer, nullable=False, default=0)
    payload = Column(Text, nullable=False)  # JSON serialized DailyLimitUpResponse

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
