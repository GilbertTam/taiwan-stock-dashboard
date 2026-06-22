"""每日漲停清單歷史 snapshot 服務。

職責:
  - save_today_snapshot — 抓 live 結果並寫入(或覆寫)今日的 snapshot
  - get_by_date         — 拿指定日期的 snapshot,反序列化回 DailyLimitUpResponse
  - list_available_dates — 列出 DB 中所有 (date, total) 給日曆 shouldDisableDate 用

序列化策略:
  - 直接把 Pydantic model dump 成 JSON 字串塞進 TEXT column
  - mode='json' 讓 date/datetime 轉成 ISO 字串,反序列化時 Pydantic 會 parse 回來
"""
from __future__ import annotations

import json
import logging
from datetime import date, datetime, timezone, timedelta
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import AsyncSessionLocal
from app.models.daily_snapshot import DailyLimitUpSnapshot
from app.schemas.stock import DailyLimitUpResponse

logger = logging.getLogger(__name__)

TPE = timezone(timedelta(hours=8))


def _today_tpe() -> date:
    return datetime.now(TPE).date()


def _parse_iso_date(s: str) -> date | None:
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


async def get_by_date(db: AsyncSession, trade_date: date) -> DailyLimitUpResponse | None:
    res = await db.execute(
        select(DailyLimitUpSnapshot).where(DailyLimitUpSnapshot.trade_date == trade_date)
    )
    snap = res.scalars().first()
    if snap is None:
        return None
    try:
        return DailyLimitUpResponse.model_validate(json.loads(snap.payload))
    except (json.JSONDecodeError, Exception) as e:  # noqa: BLE001
        logger.warning("daily_snapshot: failed to parse payload for %s: %s", trade_date, e)
        return None


async def list_available_dates(db: AsyncSession) -> list[dict]:
    """回傳 [{date: 'YYYY-MM-DD', total: int}], desc by date。"""
    res = await db.execute(
        select(DailyLimitUpSnapshot.trade_date, DailyLimitUpSnapshot.total)
        .order_by(DailyLimitUpSnapshot.trade_date.desc())
    )
    return [{"date": d.isoformat(), "total": int(t)} for d, t in res.all()]


async def upsert_snapshot(
    db: AsyncSession,
    trade_date: date,
    payload: DailyLimitUpResponse,
) -> DailyLimitUpSnapshot:
    res = await db.execute(
        select(DailyLimitUpSnapshot).where(DailyLimitUpSnapshot.trade_date == trade_date)
    )
    snap = res.scalars().first()
    raw = json.dumps(payload.model_dump(mode="json"), ensure_ascii=False)
    if snap is None:
        snap = DailyLimitUpSnapshot(
            trade_date=trade_date,
            total=payload.total,
            payload=raw,
        )
        db.add(snap)
    else:
        snap.total = payload.total
        snap.payload = raw
    await db.flush()
    return snap


async def save_today_snapshot() -> dict:
    """跑一次 live get_daily_limit_up,把結果 upsert 到 DB。

    被 scheduler / 手動 API 呼叫。回傳 {'date', 'total', 'saved': True}。
    """
    # 延遲 import 避免 circular(stock_daily 之後也可能反向 import 我們)
    from app.services import stock_daily

    today = _today_tpe()
    resp = await stock_daily.get_daily_limit_up(market="all", _from_snapshot_job=True)

    async with AsyncSessionLocal() as db:
        await upsert_snapshot(db, today, resp)
        await db.commit()

    logger.info("daily_snapshot: saved %s (total=%d)", today, resp.total)
    return {"date": today.isoformat(), "total": resp.total, "saved": True}
