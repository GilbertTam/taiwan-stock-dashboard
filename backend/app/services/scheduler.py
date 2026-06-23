"""APScheduler 整合 — 每日台股盤後排程 + 失敗自動重試。

三個 job (Asia/Taipei):
  14:35  daily_limit_up_snapshot — 把今日漲停清單 snapshot 進 DB
                                    (供日後歷史日期查詢)
  14:50  daily_broker_batch      — 對今日漲停股批次排背景抓分點
  每 10 分鐘 (09:00-21:00) retry_failed_brokers
                                  — 掃今日 failed snapshot,只挑可重試的
                                    (排除「查無資料」這類永久性失敗) 重新排程

順序很重要:14:35 先 snapshot 限漲清單,14:50 才有最新清單可批次抓 broker。

retry job 設計理由:
  - BSR 站不穩、IP 偶有 rate limit、OCR 偶爾失敗 → 都是暫時性
  - 每 10 分鐘掃一次「今日 status=failed 且 error 非永久型」的 snapshot 重排
  - broker_service._in_flight + 已 ok 的 snapshot 會自動 dedup,不會重複打
  - 限制 09:00-21:00 避免凌晨無謂連線(BSR 也通常在這時段才有資料)

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


async def _job_retry_failed_brokers() -> None:
    """每 10 分鐘 — 自動重排今日所有「可重試」的 failed snapshots。

    可重試 = NETWORK_ERROR / CAPTCHA_EXHAUSTED / DB lock / 超時 等暫時性失敗
    不可重試 = NO_DATA(BSR 站明確說沒資料)、PARSE_EMPTY
    判斷邏輯在 broker_service._is_retryable_failure 內(用 error 字串比對)。
    """
    from app.services import broker_service

    try:
        items = await broker_service.list_today_failed_retryable()
    except Exception:  # noqa: BLE001
        logger.exception("scheduler: list failed retryable raised")
        return

    if not items:
        logger.debug("scheduler: retry — no failed retryable snapshots")
        return

    result = await broker_service.batch_schedule(items)
    logger.info(
        "scheduler: retry — re-queued=%d skipped_ok=%d skipped_pending=%d total_failed=%d",
        len(result["queued"]),
        len(result["skipped_ok"]),
        len(result["skipped_pending"]),
        len(items),
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
    # 自動重試:每 10 分鐘掃今日 failed snapshots,挑可重試的重新排程。
    # 限 09:00-21:00 避免凌晨無謂連線,涵蓋盤前/盤中/盤後完整時段。
    sched.add_job(
        _job_retry_failed_brokers,
        CronTrigger(minute="*/10", hour="9-21", timezone=_TPE),
        id="retry_failed_brokers",
        replace_existing=True,
        misfire_grace_time=300,
        coalesce=True,
    )
    sched.start()
    _scheduler = sched
    logger.info(
        "scheduler: started — snapshot @ 14:35, broker batch @ 14:50, "
        "retry */10min @ 09-21 (Asia/Taipei)"
    )


def stop_scheduler() -> None:
    """在 FastAPI shutdown hook 呼叫。Idempotent。"""
    global _scheduler
    if _scheduler is None:
        return
    with suppress(Exception):
        _scheduler.shutdown(wait=False)
    _scheduler = None
    logger.info("scheduler: stopped")
