"""當日漲停（daily）API schemas。

分類欄位兩來源（沿用前端 / 需求命名）：
  - concept        ── 子產業（MoneyDJ）
  - concept_reason ── 基礎分類（TWSE 官方產業別）
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class BrokerEntry(BaseModel):
    broker: str
    buy: int = 0
    sell: int = 0
    net: int = 0


class DailyStock(BaseModel):
    code: str
    name: str
    market: str = Field(description="twse / tpex")
    close: float
    changePercent: float
    volume: int
    concept: str = ""            # 子產業（MoneyDJ）
    concept_reason: str = ""     # 基礎分類（TWSE）
    foreign: int = 0
    trust: int = 0
    dealer: int = 0
    brokers: list[BrokerEntry] = Field(default_factory=list)


class SectorOption(BaseModel):
    name: str
    count: int


class MarketBreakdown(BaseModel):
    twse: int = 0
    tpex: int = 0


class DailyLimitUpResponse(BaseModel):
    date: str
    updatedAt: str
    total: int
    breakdown: MarketBreakdown = Field(default_factory=MarketBreakdown)
    baseSectors: list[SectorOption] = Field(default_factory=list)
    subSectors: list[SectorOption] = Field(default_factory=list)
    stocks: list[DailyStock] = Field(default_factory=list)
