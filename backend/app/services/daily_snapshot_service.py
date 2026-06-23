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


async def backfill_institutionals_for_date(date_str: str) -> dict:
    """重新抓指定日期的 TWSE+TPEX 三大法人,in-place 更新該日 snapshot。

    只動 foreign / trust / dealer 三欄,price / volume / sector / brokers 都不動。
    回傳:{date, total, matched, updated, missing}
      matched = inst 端點有資料的 stock 數
      updated = snapshot 內被更新的 stock 數
      missing = snapshot 內有但 inst 端點沒給的 stock 數
    """
    from app.services import stock_daily

    target = _parse_iso_date(date_str)
    if target is None:
        raise ValueError(f"invalid date format: {date_str}")

    async with AsyncSessionLocal() as db:
        snap = await get_by_date(db, target)
    if snap is None:
        raise LookupError(f"no snapshot for {date_str}")

    inst_map = await stock_daily.fetch_historical_institutionals(date_str)

    updated = 0
    missing = 0
    for s in snap.stocks:
        flow = inst_map.get(s.code)
        if flow is None:
            missing += 1
            continue
        s.foreign = int(flow.get("foreign", 0))
        s.trust = int(flow.get("trust", 0))
        s.dealer = int(flow.get("dealer", 0))
        updated += 1

    # 寫回(snapshot 結構不變,只是 stocks 裡的數字被更新)
    async with AsyncSessionLocal() as db:
        await upsert_snapshot(db, target, snap)
        await db.commit()

    logger.info(
        "backfill institutionals %s: matched=%d updated=%d missing=%d total=%d",
        date_str, len(inst_map), updated, missing, len(snap.stocks),
    )
    return {
        "date": date_str,
        "total": len(snap.stocks),
        "matched": len(inst_map),
        "updated": updated,
        "missing": missing,
    }


async def backfill_institutionals_range(days: int) -> list[dict]:
    """從今日往回 N 天逐日 backfill;沒有 snapshot 的日期 skip。"""
    today = _today_tpe()
    results: list[dict] = []
    for delta in range(1, days + 1):
        d = today - timedelta(days=delta)
        date_str = d.isoformat()
        try:
            r = await backfill_institutionals_for_date(date_str)
            results.append({"date": date_str, "status": "ok", **r})
        except LookupError:
            results.append({"date": date_str, "status": "no_snapshot"})
        except Exception as e:  # noqa: BLE001
            logger.exception("backfill %s raised", date_str)
            results.append({"date": date_str, "status": "error", "error": str(e)})
    return results
