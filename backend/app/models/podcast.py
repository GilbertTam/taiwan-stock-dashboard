"""財經 Podcast / YouTube 內容分析 model — 上承 /dashboard/podcast 頁面。

資料來源：`backend/scripts/podcast_agent.py` 爬蟲，抓 YouTube RSS / 股癌逐字稿，
經 Claude 抽取出「摘要 + 題材 + 時間軸段落 + 個股/族群情緒」後寫入這三張表。

三張表（與爬蟲端 PodcastRepository.init_schema() 建出的 schema 必須一致）：

  podcast_videos
    每支影片 / 每集 Podcast 一列。video_id 為業務主鍵
    （YouTube 11 碼 ID；股癌為 "gooaye_EPxxxx"）。含處理狀態與 AI 摘要。

  podcast_segments
    每集依時間戳切出的主題段落（每集約 3~8 段）。

  podcast_mentions
    節目中主持人實際表態的個股 / 族群標的與情緒（樂觀 / 悲觀 / 中立）。

設計取捨：
  - video_id 直接當字串主鍵（沿用爬蟲端 schema），segments / mentions 以它為外鍵。
  - topics 用 Text 存 JSON 陣列字串（SQLite 無 native array），讀取端自行 parse。
  - 不用 ENUM（SQLite 不支援），sentiment / status 用 String + 常數白名單。
"""
from __future__ import annotations

from sqlalchemy import (
    Column,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.db import Base


# ── 狀態 / 情緒常數（替代 ENUM，SQLite 友好） ─────────────────────
class VideoStatus:
    DONE = "done"                    # 已抓字幕 + Claude 分析 + 入庫
    NO_TRANSCRIPT = "no_transcript"  # 無字幕且 Whisper 也失敗
    BASELINE = "baseline"            # 首跑時標記的歷史影片，不分析


class Sentiment:
    BULLISH = "樂觀"
    BEARISH = "悲觀"
    NEUTRAL = "中立"


class PodcastVideo(Base):
    """每支影片 / 每集 Podcast 一列。"""

    __tablename__ = "podcast_videos"

    video_id = Column(String, primary_key=True, index=True)
    channel = Column(String, index=True)         # 頻道名稱，如 "Gooaye 股癌"
    title = Column(String)
    published = Column(String)                    # 發布時間（ISO 或 YYYY-MM-DD）
    url = Column(String)
    status = Column(String)                       # VideoStatus.*
    summary = Column(Text)                        # Claude 一句話摘要
    topics = Column(Text)                         # JSON 陣列字串，如 '["半導體","AI"]'
    processed_at = Column(String)                 # 入庫時間（ISO 字串）

    segments = relationship(
        "PodcastSegment",
        back_populates="video",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    mentions = relationship(
        "PodcastMention",
        back_populates="video",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_podcast_videos_channel_published", "channel", "published"),
    )


class PodcastSegment(Base):
    """每集依時間軸切分的主題段落。"""

    __tablename__ = "podcast_segments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    video_id = Column(
        String,
        ForeignKey("podcast_videos.video_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    start = Column(String)    # mm:ss
    end = Column(String)      # mm:ss
    title = Column(String)    # 段落標題（10 字內）
    topic = Column(String)    # 題材分類
    content = Column(Text)    # 段落重點（2~3 句）

    video = relationship("PodcastVideo", back_populates="segments")


class PodcastMention(Base):
    """節目中主持人表態的個股 / 族群標的與情緒。"""

    __tablename__ = "podcast_mentions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    video_id = Column(
        String,
        ForeignKey("podcast_videos.video_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target = Column(String, nullable=False, index=True)  # 標的名稱，如 "台積電"
    target_type = Column(String)                         # "stock" / "sector"
    ticker = Column(String, index=True)                  # 代號，如 "2330" / "NVDA"
    sentiment = Column(String, index=True)               # Sentiment.*
    reason = Column(Text)                                # 一句話理由

    video = relationship("PodcastVideo", back_populates="mentions")

    __table_args__ = (
        Index("ix_podcast_mentions_sentiment", "sentiment"),
    )
