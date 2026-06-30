"""台股庫藏股(買回自家股份)model — 上承 /dashboard/repurchase 頁面。

資料來源:MOPS ajax_t35sc09「買回自己公司股份彙總統計表」(上市 sii + 上櫃 otc)。
一家公司一個董事會決議日一筆;狀態(執行中/新公告/完成)在 service 衍生。
日期來源為民國,入庫前轉 ISO。金額單位:元;股數:股。
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


class TreasuryBuyback(Base):
    """一家公司一次庫藏股買回(以董事會決議日識別)。"""

    __tablename__ = "treasury_buyback"

    id = Column(Integer, primary_key=True, index=True)

    code = Column(String, nullable=False, index=True)   # 公司代號
    name = Column(String, nullable=False, default="")   # 公司名稱
    market = Column(String, nullable=False, default="")  # "twse" / "tpex"

    board_date = Column(String, nullable=False, index=True)  # 董事會決議日 "YYYY-MM-DD"
    purpose = Column(String, default="")                # 買回目的(中文)

    amount_cap = Column(Numeric(20, 0))        # 買回股份總金額上限(元)
    planned_shares = Column(Numeric(20, 0))    # 預定買回股數(股)
    price_low = Column(Numeric(12, 2))         # 買回價格區間 最低
    price_high = Column(Numeric(12, 2))        # 買回價格區間 最高
    period_start = Column(String, default="")  # 預定買回期間 起 "YYYY-MM-DD"
    period_end = Column(String, default="")    # 預定買回期間 迄 "YYYY-MM-DD"

    is_done = Column(Integer, default=0)       # 是否執行完畢(1/0)
    bought_shares = Column(Numeric(20, 0))     # 已買回股數
    bought_amount = Column(Numeric(20, 0))     # 已買回總金額
    bought_pct = Column(Numeric(8, 2))         # 已買回佔預定比例(%)
    avg_price = Column(Numeric(12, 2))         # 平均每股買回價格

    # 首次觀測 — 新公告判定。insert 設,update 不動。
    first_seen_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("code", "board_date", name="uq_treasury_code_board"),
        Index("ix_treasury_board_date", "board_date"),
        Index("ix_treasury_first_seen", "first_seen_at"),
    )
