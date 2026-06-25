"""財經 Podcast API（mounted under /api/podcast）。

唯讀端點，資料由 backend/scripts/podcast_agent.py 爬蟲寫入：

  GET /podcast/channels              — 頻道卡片 grid（每頻道一張卡的彙整）
  GET /podcast/channels/{channel}    — 單一頻道詳情（集數 + 段落 + 標的情緒）
  GET /podcast/mentions/top?days=30  — 最近 N 天熱門標的
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas.podcast import (
    ChannelDetailResponse,
    ChannelListResponse,
    TopMentionsResponse,
)
from app.services import podcast_service

router = APIRouter()


@router.get("/channels", response_model=ChannelListResponse)
async def list_channels(db: AsyncSession = Depends(get_db)) -> Any:
    """頻道卡片 grid。"""
    channels = await podcast_service.list_channels(db)
    return ChannelListResponse(channels=channels)


@router.get("/channels/{channel}", response_model=ChannelDetailResponse)
async def channel_detail(
    channel: str,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """單一頻道詳情。"""
    detail = await podcast_service.get_channel_detail(db, channel)
    if detail.episode_count == 0:
        raise HTTPException(status_code=404, detail=f"no episodes for channel: {channel}")
    return detail


@router.get("/mentions/top", response_model=TopMentionsResponse)
async def mentions_top(
    days: int = Query(30, ge=1, le=365),
    channel: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """最近 N 天熱門標的。"""
    mentions = await podcast_service.top_mentions(db, days=days, channel=channel)
    return TopMentionsResponse(days=days, mentions=mentions)
