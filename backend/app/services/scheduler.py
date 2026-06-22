"""APScheduler 整合 — 每日台股盤後排程。

兩個 job:
  14:35 Asia/Taipei  daily_limit_up_snapshot  — 把今日漲停清單 snapshot 進 DB
                                                 (供日後歷史日期查詢)
  14:50 Asia/Taipei  daily_broker_batch       — 對今日漲停股批次排背景抓分點

  順序很重要:先 snapshot,再排 broker 抓,因為 broker batch 也要用 limit-up 清單。

  14:35 起點:台股 13:30 收盤後 ~30-60 分鐘 OpenAPI 才會出資料,
  再延後 5 分鐘讓 broker 任務有最新清單可用。

設計:
  - AsyncIOScheduler 與 FastAPI 共用 event loop
  - app/main.py 在 startup 呼叫 start_scheduler()、shutdown 時 stop
"""
from __future__ import annotations

import logging
from contextlib import suppress
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None
_TPE = ZoneInfo("Asia/Taipei")


async def _job_daily_snapshot() -> None:
    """14:35 — 把今日 live limit-up 結果 upsert 到 daily_limit_up_snapshots。"""
    from app.services import daily_snapshot_service

    logger.info("scheduler: daily snapshot starting")
    try:
        result = await daily_snapshot_service.save_today_snapshot()
        logger.info("scheduler: daily snapshot done: %s", result)
    except Exception:  # noqa: BLE001
        logger.exception("scheduler: daily snapshot failed")


async def _job_daily_broker_batch() -> None:
    """14:50 — 對今日漲停清單批次排程抓 broker 分點。"""
    from app.services import broker_service, stock_daily

    logger.info("scheduler: daily broker batch starting")
    try:
        resp = await stock_daily.get_daily_limit_up(market="all")
    except Exception:  # noqa: BLE001
        logger.exception("scheduler: failed to fetch daily limit-up list")
        return

    items = [
        {"code": s.code, "name": s.name, "market": s.market}
        for s in resp.stocks
    ]
    if not items:
        logger.info("scheduler: no limit-up stocks today (count=0)")
        return

    result = await broker_service.batch_schedule(items)
    logger.info(
        "scheduler: queued=%d skipped_ok=%d skipped_pending=%d",
        len(result["queued"]),
        len(result["skipped_ok"]),
        len(result["skipped_pending"]),
    )


def start_scheduler() -> None:
    """在 FastAPI startup hook 呼叫。Idempotent。"""
    global _scheduler
    if _scheduler is not None:
        return

    sched = AsyncIOScheduler(timezone=_TPE)
    sched.add_job(
        _job_daily_snapshot,
        CronTrigger(hour=14, minute=35, timezone=_TPE),
        id="daily_snapshot",
        replace_existing=True,
        misfire_grace_time=3600,
        coalesce=True,
    )
    sched.add_job(
        _job_daily_broker_batch,
        CronTrigger(hour=14, minute=50, timezone=_TPE),
        id="daily_broker_batch",
        replace_existing=True,
        misfire_grace_time=3600,
        coalesce=True,
    )
    sched.start()
    _scheduler = sched
    logger.info("scheduler: started — snapshot @ 14:35, broker batch @ 14:50 (Asia/Taipei)")


def stop_scheduler() -> None:
    """在 FastAPI shutdown hook 呼叫。Idempotent。"""
    global _scheduler
    if _scheduler is None:
        return
    with suppress(Exception):
        _scheduler.shutdown(wait=False)
    _scheduler = None
    logger.info("scheduler: stopped")
