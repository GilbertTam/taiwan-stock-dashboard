"""財經 Podcast 唯讀查詢服務 — 餵 /api/podcast/*。

只讀 podcast_videos / podcast_segments / podcast_mentions 三表（由
`backend/scripts/podcast_agent.py` 爬蟲寫入），組裝成前端要的頻道卡片 /
頻道詳情結構。不負責任何寫入。
"""
from __future__ import annotations

import json
import logging
from collections import defaultdict
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.podcast import PodcastMention, PodcastVideo
from app.schemas.podcast import (
    ChannelDetailResponse,
    ChannelSummaryOut,
    EpisodeOut,
    MentionOut,
    QAOut,
    SegmentOut,
    SentimentCounts,
    StockEpisodeOut,
    StockEpisodesResponse,
    TopMention,
)

logger = logging.getLogger(__name__)

# 只統計實際完成分析的影片（baseline / no_transcript 不算入卡片彙整）
_ANALYZED = ("done",)


def _parse_topics(raw: Optional[str]) -> list[str]:
    """topics 欄位存 JSON 陣列字串，安全 parse 成 list[str]。"""
    if not raw:
        return []
    try:
        val = json.loads(raw)
        return [str(t) for t in val] if isinstance(val, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


def _empty_counts() -> dict[str, int]:
    return {"樂觀": 0, "悲觀": 0, "中立": 0}


def _to_counts(d: dict[str, int]) -> SentimentCounts:
    return SentimentCounts(bullish=d["樂觀"], bearish=d["悲觀"], neutral=d["中立"])


async def _top_mentions_for_videos(
    db: AsyncSession, video_ids: list[str], limit: int = 8
) -> list[TopMention]:
    """跨指定影片彙整熱門標的（依出現集數排序）。"""
    if not video_ids:
        return []

    res = await db.execute(
        select(PodcastMention).where(PodcastMention.video_id.in_(video_ids))
    )
    rows = res.scalars().all()

    agg: dict[str, dict] = {}
    for m in rows:
        key = m.target or "?"
        slot = agg.setdefault(
            key,
            {
                "target": key,
                "ticker": m.ticker,
                "target_type": m.target_type,
                "count": 0,
                "sentiment": _empty_counts(),
            },
        )
        slot["count"] += 1
        if m.ticker and not slot["ticker"]:
            slot["ticker"] = m.ticker
        if m.sentiment in slot["sentiment"]:
            slot["sentiment"][m.sentiment] += 1

    top = sorted(agg.values(), key=lambda s: s["count"], reverse=True)[:limit]
    return [
        TopMention(
            target=s["target"],
            ticker=s["ticker"],
            target_type=s["target_type"],
            count=s["count"],
            sentiment=_to_counts(s["sentiment"]),
        )
        for s in top
    ]


async def list_channels(db: AsyncSession) -> list[ChannelSummaryOut]:
    """每個頻道一張卡：集數、最新一集、情緒分佈、熱門標的。"""
    # 每頻道的集數與最新發布
    res = await db.execute(
        select(PodcastVideo).where(PodcastVideo.status.in_(_ANALYZED))
    )
    videos = res.scalars().all()

    by_channel: dict[str, list[PodcastVideo]] = defaultdict(list)
    for v in videos:
        by_channel[v.channel or "未分類"].append(v)

    summaries: list[ChannelSummaryOut] = []
    for channel, vids in by_channel.items():
        # 最新一集（published 字串排序，ISO / YYYY-MM-DD 皆可比大小）
        vids_sorted = sorted(vids, key=lambda v: (v.published or ""), reverse=True)
        latest = vids_sorted[0]
        video_ids = [v.video_id for v in vids]

        # 情緒分佈
        counts = _empty_counts()
        sres = await db.execute(
            select(PodcastMention.sentiment, func.count())
            .where(PodcastMention.video_id.in_(video_ids))
            .group_by(PodcastMention.sentiment)
        )
        for sentiment, n in sres.all():
            if sentiment in counts:
                counts[sentiment] += int(n)

        top_mentions = await _top_mentions_for_videos(db, video_ids, limit=6)

        summaries.append(
            ChannelSummaryOut(
                channel=channel,
                episode_count=len(vids),
                latest_published=latest.published,
                latest_title=latest.title,
                sentiment=_to_counts(counts),
                top_mentions=top_mentions,
            )
        )

    # 卡片預設依集數多寡排序
    summaries.sort(key=lambda c: c.episode_count, reverse=True)
    return summaries


async def get_channel_detail(db: AsyncSession, channel: str) -> ChannelDetailResponse:
    """單一頻道詳情：集數列表（含段落與標的情緒）。"""
    res = await db.execute(
        select(PodcastVideo)
        .where(PodcastVideo.channel == channel)
        .where(PodcastVideo.status.in_(_ANALYZED))
    )
    videos = res.scalars().all()
    videos.sort(key=lambda v: (v.published or ""), reverse=True)

    episodes: list[EpisodeOut] = []
    counts = _empty_counts()
    for v in videos:
        # relationship 已 selectin 載入 segments / mentions
        segments = sorted(v.segments, key=lambda s: (s.start or ""))
        for m in v.mentions:
            if m.sentiment in counts:
                counts[m.sentiment] += 1

        episodes.append(
            EpisodeOut(
                video_id=v.video_id,
                channel=v.channel,
                title=v.title,
                published=v.published,
                url=v.url,
                status=v.status,
                summary=v.summary,
                topics=_parse_topics(v.topics),
                segments=[
                    SegmentOut(
                        start=s.start, end=s.end, title=s.title,
                        topic=s.topic, content=s.content,
                    )
                    for s in segments
                ],
                mentions=[
                    MentionOut(
                        target=m.target, target_type=m.target_type, ticker=m.ticker,
                        sentiment=m.sentiment if m.sentiment in counts else "中立",
                        reason=m.reason,
                    )
                    for m in v.mentions
                ],
                qa=[
                    QAOut(
                        idx=q.idx, question=q.question, answer=q.answer,
                        off_topic=bool(q.off_topic),
                    )
                    for q in sorted(v.qa, key=lambda q: (q.idx if q.idx is not None else 0))
                ],
            )
        )

    video_ids = [v.video_id for v in videos]
    top_mentions = await _top_mentions_for_videos(db, video_ids, limit=12)

    return ChannelDetailResponse(
        channel=channel,
        episode_count=len(videos),
        sentiment=_to_counts(counts),
        top_mentions=top_mentions,
        episodes=episodes,
    )


async def top_mentions(
    db: AsyncSession, days: int = 30, channel: Optional[str] = None
) -> list[TopMention]:
    """最近 N 天熱門標的（依 processed_at 過濾），可限定頻道。"""
    q = (
        select(PodcastVideo.video_id)
        .where(PodcastVideo.status.in_(_ANALYZED))
        .where(PodcastVideo.processed_at >= func.datetime("now", f"-{int(days)} days"))
    )
    if channel:
        q = q.where(PodcastVideo.channel == channel)
    res = await db.execute(q)
    video_ids = [vid for (vid,) in res.all()]
    return await _top_mentions_for_videos(db, video_ids, limit=25)


async def get_stock_episodes(db: AsyncSession, key: str) -> StockEpisodesResponse:
    """點個股標籤 → 跨所有頻道列出講過該標的的集數。

    key 可為代號(ticker)或名稱;以 ticker 為主鍵聚合(NVIDIA/輝達 同 NVDA 併在一起)。
    """
    key = (key or "").strip()
    if not key:
        return StockEpisodesResponse(key=key)

    # 先看 key 是不是某個 ticker(精準);是的話用 ticker 撈(同義名都進來)
    res = await db.execute(
        select(PodcastMention, PodcastVideo)
        .join(PodcastVideo, PodcastVideo.video_id == PodcastMention.video_id)
        .where(
            (PodcastMention.ticker == key)
            | (PodcastMention.target == key)
            | (PodcastMention.target.like(f"%{key}%"))
        )
        .where(PodcastVideo.status.in_(_ANALYZED))
    )
    rows = res.all()

    # 若 key 命中某 ticker,收斂到「同 ticker」的所有列(把同義名也一起帶出)
    tickers = {m.ticker for m, _ in rows if m.ticker}
    name = None
    counts = _empty_counts()
    episodes: list[StockEpisodeOut] = []
    seen: set[tuple[str, str]] = set()
    for m, v in rows:
        dedup = (v.video_id, m.target)
        if dedup in seen:
            continue
        seen.add(dedup)
        if name is None:
            name = m.target
        if m.sentiment in counts:
            counts[m.sentiment] += 1
        episodes.append(StockEpisodeOut(
            channel=v.channel or "", video_id=v.video_id, title=v.title,
            published=v.published, url=v.url, target=m.target,
            target_type=m.target_type, ticker=m.ticker,
            sentiment=m.sentiment if m.sentiment in counts else "中立",
            reason=m.reason,
        ))

    episodes.sort(key=lambda e: (e.published or ""), reverse=True)
    return StockEpisodesResponse(
        key=key, name=name,
        ticker=(sorted(tickers)[0] if len(tickers) == 1 else None),
        total=len(episodes), sentiment=_to_counts(counts), episodes=episodes,
    )
