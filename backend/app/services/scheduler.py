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


async def _job_daily_snapshot_chase_today() -> None:
    """每 10 分鐘 (15:00-21:00) — 等 TWSE/TPEX Date 推進到今日後再 snapshot。

    背景:14:35 主 snapshot job 跑時,TWSE OpenAPI 常常還沒推進到當日資料,
    導致 snapshot 的 trade_date 仍是「最近交易日」(昨天/上週五),
    使用者看到的「今日漲停」實際是昨日清單。

    本 job 每 10 分鐘 fetch 一次 live 結果:
      - 看 response.date(取自 TWSE Date 民國 → 西元)是否 == today
      - 不是 → 還沒更新,noop;TWSE 多半 17-20 點之間會 push 完
      - 是   → 此日期 DB 還沒對應 snapshot → upsert(覆寫舊的、新增今日)
                若已有 snapshot 也 upsert(同日重新整理)

    全程 try/except 兜底 — 任何 fetch/parse/DB write 失敗都吞掉,不讓
    APScheduler 收到 raised exception 變成 ERROR 級 log 干擾真正問題。
    """
    today_str = datetime.now(_TPE).strftime("%Y-%m-%d")
    try:
        from app.db import AsyncSessionLocal
        from app.services import stock_daily
        from app.services.daily_snapshot_service import _parse_iso_date, upsert_snapshot

        try:
            resp = await stock_daily.get_daily_limit_up(market="all", _from_snapshot_job=True)
        except Exception:  # noqa: BLE001
            logger.exception("scheduler: chase-today fetch failed")
            return

        if resp.date != today_str:
            logger.debug(
                "scheduler: chase-today — TWSE Date still %s != today %s, noop",
                resp.date, today_str,
            )
            return

        # TWSE 已推進到今日(或 Yahoo fallback 已提供 today 資料)→ upsert
        target = _parse_iso_date(today_str)
        if target is None:
            return
        try:
            async with AsyncSessionLocal() as db:
                await upsert_snapshot(db, target, resp)
                await db.commit()
        except Exception:  # noqa: BLE001
            logger.exception("scheduler: chase-today DB upsert failed")
            return

        logger.info(
            "scheduler: chase-today — date matched today=%s, snapshot saved (total=%d)",
            today_str, resp.total,
        )
    except Exception:  # noqa: BLE001
        # 最外層兜底:不該到這裡,但保險不讓 APScheduler 看到 raised exception
        logger.exception("scheduler: chase-today outer failure")


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
    """每 10 分鐘 — 自動重排今日:
      A. 「可重試的 failed」  — 一般 schedule_crawl (in_flight dedup)
      B. 「ok 但壞掉的」     — force_recrawl(先把 ok 改 pending 再排)

    A 的判定 = NETWORK_ERROR / CAPTCHA_EXHAUSTED / DB lock / 超時等暫時性失敗
              不可重試 = NO_DATA、PARSE_EMPTY(BSR 確認永久狀態)
    B 的判定 = broker_name == code 比例 ≥ 50% 或 buy 總和 != sell 總和 或 全 0
              用於 parser 修 bug 後撈回舊版寫的壞資料
    """
    from app.services import broker_service

    # A. 一般 failed retryable
    try:
        failed_items = await broker_service.list_today_failed_retryable()
    except Exception:  # noqa: BLE001
        logger.exception("scheduler: list_today_failed_retryable raised")
        failed_items = []

    # B. ok 但內容壞掉的(舊 parser bug 過版本)
    try:
        broken_items = await broker_service.list_today_broken_ok()
    except Exception:  # noqa: BLE001
        logger.exception("scheduler: list_today_broken_ok raised")
        broken_items = []

    # C. 卡在 pending 超過 5 分鐘的(通常是 container 重啟造成的孤兒)
    try:
        stuck_items = await broker_service.list_today_stuck_pending(min_age_minutes=5)
    except Exception:  # noqa: BLE001
        logger.exception("scheduler: list_today_stuck_pending raised")
        stuck_items = []

    if not failed_items and not broken_items and not stuck_items:
        logger.debug("scheduler: retry — nothing to do")
        return

    # A: 走 batch_schedule(內部用 schedule_crawl,撞 already_ok 會 skip)
    failed_result = (
        await broker_service.batch_schedule(failed_items) if failed_items
        else {"queued": [], "skipped_ok": [], "skipped_pending": []}
    )
    # B: 一個個 force_recrawl
    broken_queued = []
    for item in broken_items:
        result = await broker_service.force_recrawl(
            item["code"], name=item["name"], market=item["market"],
        )
        if result == "pending":
            broken_queued.append(item["code"])
    # C: orphan pending → 同樣 force_recrawl 重新接續
    stuck_queued = []
    for item in stuck_items:
        result = await broker_service.force_recrawl(
            item["code"], name=item["name"], market=item["market"],
        )
        if result == "pending":
            stuck_queued.append(item["code"])

    logger.info(
        "scheduler: retry — failed=%d/%d broken=%d/%d stuck_pending=%d/%d",
        len(failed_result["queued"]), len(failed_items),
        len(broken_queued), len(broken_items),
        len(stuck_queued), len(stuck_items),
    )


def _run_podcast_sync_blocking() -> None:
    """同步執行 podcast 增量同步（在 worker thread 跑）。

    只跑「免 API key」的兩條來源：股癌 gooaye + PodSight 回填。
    YouTube monitor（需 ANTHROPIC_API_KEY + 額外相依）刻意不在此，留待另行排程。
    爬蟲是同步 sqlite3，放在 asyncio.to_thread 的 worker thread 執行，
    不阻塞 FastAPI event loop（避免重演 broker 爬蟲卡 healthcheck 的問題）。
    """
    import scripts.podcast_agent as pa

    config = pa.AgentConfig.from_env()
    pipe = pa.PodcastAgentPipeline(config)
    try:
        pipe.run_gooaye_sync(use_sitemap=False)
        for slug, channel in config.podsight_channels.items():
            pipe.run_podsight_sync(slug, channel)
    finally:
        pipe.repo.close()


async def _job_podcast_sync() -> None:
    """08:30 / 20:30 (Asia/Taipei) — podcast 來源增量同步（gooaye + PodSight，免 key）。"""
    import asyncio

    logger.info("scheduler: podcast sync starting")
    try:
        await asyncio.to_thread(_run_podcast_sync_blocking)
        logger.info("scheduler: podcast sync done")
    except Exception:  # noqa: BLE001
        logger.exception("scheduler: podcast sync failed")


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
    # Chase-today:每 10 分鐘(15:00-21:00)等 TWSE Date 推進到今日後 snapshot。
    # 14:35 主 job 跑時常常 OpenAPI 還沒更新到今日,這個 job 補上「等更新」的循環。
    sched.add_job(
        _job_daily_snapshot_chase_today,
        CronTrigger(minute="*/10", hour="15-21", timezone=_TPE),
        id="daily_snapshot_chase_today",
        replace_existing=True,
        misfire_grace_time=300,
        coalesce=True,
    )
    # Podcast 來源增量同步：每天 08:30 / 20:30 跑 gooaye + PodSight(免 key)。
    # 這些是「每日節目」,RSS/列表一天才更新,兩個時段足夠且省資源。
    sched.add_job(
        _job_podcast_sync,
        CronTrigger(hour="8,20", minute=30, timezone=_TPE),
        id="podcast_sync",
        replace_existing=True,
        misfire_grace_time=3600,
        coalesce=True,
    )
    sched.start()
    _scheduler = sched
    logger.info(
        "scheduler: started — snapshot @ 14:35, broker batch @ 14:50, "
        "retry */10min @ 09-21, chase-today */10min @ 15-21, "
        "podcast sync @ 08:30/20:30 (Asia/Taipei)"
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
