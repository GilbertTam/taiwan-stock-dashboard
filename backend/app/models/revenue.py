"""台股月營收 model — 上承 /dashboard/revenue 頁面。

資料來源:TWSE / TPEX OpenAPI 月營收(t187ap05)。每家公司每個資料年月一列。

即時感作法:OpenAPI 在每月 1-10 號公告期會隨公司申報逐步長出資料;
scheduler 在公告期高頻同步,對每筆 (code, year_month) 記 first_seen_at
(首次觀測時間)。first_seen_at = 今日 即「新申報」,依它排序就有「剛公布」感。

金額單位沿用來源:仟元(thousand NTD)。
"""
from __future__ import annotations

from sqlalchemy import (
    Column,
    DateTime,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.sql import func

from app.db import Base


class MonthlyRevenue(Base):
    """一家公司一個資料年月的月營收。"""

    __tablename__ = "monthly_revenue"

    id = Column(Integer, primary_key=True, index=True)

    code = Column(String, nullable=False, index=True)   # 公司代號 "2330"
    name = Column(String, nullable=False, default="")   # 公司名稱
    market = Column(String, nullable=False, default="")  # "twse" / "tpex"
    industry = Column(String, nullable=False, default="")  # 產業別

    year_month = Column(String, nullable=False, index=True)  # 正規化 "YYYY-MM"
    roc_year_month = Column(String, nullable=False, default="")  # 原始民國 "11505"

    # 金額:仟元。用 Numeric 避免大數浮點漂移;可為 None(來源缺值)
    revenue = Column(Numeric(20, 0))             # 當月營收
    last_month_revenue = Column(Numeric(20, 0))  # 上月營收
    last_year_revenue = Column(Numeric(20, 0))   # 去年當月營收

    mom_pct = Column(Numeric(12, 4))  # 上月比較增減(%)
    yoy_pct = Column(Numeric(12, 4))  # 去年同月增減(%)

    cum_revenue = Column(Numeric(20, 0))    # 當月累計營收
    cum_last_year = Column(Numeric(20, 0))  # 去年累計營收
    cum_yoy_pct = Column(Numeric(12, 4))    # 累計前期比較增減(%)

    note = Column(String, default="")  # 備註

    # 首次觀測時間 — 新申報偵測用。insert 時設,update 不動。
    first_seen_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        # 一家公司一個年月唯一 → upsert 天然 idempotent
        UniqueConstraint("code", "year_month", name="uq_monthly_revenue_code_ym"),
        Index("ix_monthly_revenue_ym_yoy", "year_month", "yoy_pct"),
        Index("ix_monthly_revenue_first_seen", "first_seen_at"),
    )
