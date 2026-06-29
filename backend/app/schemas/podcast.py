"""財經 Podcast API schemas — 餵 /dashboard/podcast 頁面。

兩個層級：
  - 頻道卡片 (ChannelSummaryOut)：landing grid 用，每頻道一張卡的彙整。
  - 頻道詳情 (ChannelDetailResponse)：集數列表 + 每集段落 / 標的情緒。
"""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

SentimentLiteral = Literal["樂觀", "悲觀", "中立"]


class SentimentCounts(BaseModel):
    """一組樂觀 / 悲觀 / 中立的計數。"""
    bullish: int = 0
    bearish: int = 0
    neutral: int = 0


class MentionOut(BaseModel):
    """一個個股 / 族群標的的情緒表態。"""
    target: str
    target_type: Optional[str] = None   # "stock" / "sector"
    ticker: Optional[str] = None
    sentiment: SentimentLiteral = "中立"
    reason: Optional[str] = None


class SegmentOut(BaseModel):
    """一段時間軸主題段落。"""
    start: Optional[str] = None
    end: Optional[str] = None
    title: Optional[str] = None
    topic: Optional[str] = None
    content: Optional[str] = None


class TopMention(BaseModel):
    """頻道卡片用的「熱門標的」彙整（跨集合計）。"""
    target: str
    ticker: Optional[str] = None
    target_type: Optional[str] = None
    count: int = 0
    sentiment: SentimentCounts = Field(default_factory=SentimentCounts)


class ChannelSummaryOut(BaseModel):
    """GET /api/podcast/channels 每個頻道一張卡。"""
    channel: str
    episode_count: int = 0
    latest_published: Optional[str] = None
    latest_title: Optional[str] = None
    sentiment: SentimentCounts = Field(default_factory=SentimentCounts)
    top_mentions: list[TopMention] = Field(default_factory=list)


class QAOut(BaseModel):
    """節目精選問答。"""
    idx: Optional[int] = None
    question: Optional[str] = None
    answer: Optional[str] = None
    off_topic: bool = False


class EpisodeOut(BaseModel):
    """頻道詳情中的一集 / 一支影片。"""
    video_id: str
    channel: Optional[str] = None
    title: Optional[str] = None
    published: Optional[str] = None
    url: Optional[str] = None
    status: Optional[str] = None
    summary: Optional[str] = None
    topics: list[str] = Field(default_factory=list)
    segments: list[SegmentOut] = Field(default_factory=list)
    mentions: list[MentionOut] = Field(default_factory=list)
    qa: list[QAOut] = Field(default_factory=list)


class StockEpisodeOut(BaseModel):
    """某個股/族群在某集的表態(點標籤看集數用)。"""
    channel: str
    video_id: str
    title: Optional[str] = None
    published: Optional[str] = None
    url: Optional[str] = None
    target: str
    target_type: Optional[str] = None
    ticker: Optional[str] = None
    sentiment: SentimentLiteral = "中立"
    reason: Optional[str] = None


class StockEpisodesResponse(BaseModel):
    """GET /api/podcast/stocks/{key} 回傳。"""
    key: str
    name: Optional[str] = None
    ticker: Optional[str] = None
    total: int = 0
    sentiment: SentimentCounts = Field(default_factory=SentimentCounts)
    episodes: list[StockEpisodeOut] = Field(default_factory=list)


class ChannelDetailResponse(BaseModel):
    """GET /api/podcast/channels/{channel} 回傳結構。"""
    channel: str
    episode_count: int = 0
    sentiment: SentimentCounts = Field(default_factory=SentimentCounts)
    top_mentions: list[TopMention] = Field(default_factory=list)
    episodes: list[EpisodeOut] = Field(default_factory=list)


class ChannelListResponse(BaseModel):
    """GET /api/podcast/channels 回傳結構。"""
    channels: list[ChannelSummaryOut] = Field(default_factory=list)


class TopMentionsResponse(BaseModel):
    """GET /api/podcast/mentions/top 回傳結構。"""
    days: int
    mentions: list[TopMention] = Field(default_factory=list)
