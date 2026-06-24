"""分點券商業務層 — Repo + Crawl Orchestrator。

兩個職責放同檔（規模小，不值得拆）：

1. Repo（讀寫 DB）
   - get_or_create_stock(code)
   - get_snapshot(code, trade_date) → BrokerSnapshot | None
   - upsert_snapshot_pending(code, trade_date) → BrokerSnapshot
   - upsert_snapshot_ok(snapshot_id, payload) → 寫入 ok + 全量 entries + 排名
   - mark_failed(snapshot_id, error)
   - fetch_top(snapshot_id, n=15) → buy_top, sell_top, all

2. Crawl Orchestrator
   - schedule_crawl(code, db_session_factory) → 把抓取丟到背景，含
     in-process semaphore（最多 2 並發）+ in-flight dedup
   - batch_schedule(codes, ...) → 一次排多檔

關鍵設計：
   - 抓取本身是 sync（requests + 重度 OCR），透過 asyncio.to_thread() 卸到 thread pool
   - DB 寫入是 async，crawl 結束後在背景 task 內自建一個 AsyncSession
     （獨立於 web request 的 session，不受 http 連線生命週期影響）
   - _in_flight 集合用 (code, date) 防止同檔同日重複入隊
   - 中途崩潰怎麼辦：snapshot 留在 pending；可由 batch 重抓或加 TTL 重啟邏輯
"""
from __future__ import annotations

import asyncio
import logging
from datetime import date, datetime, timezone, timedelta
from typing import Iterable

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import AsyncSessionLocal
from app.models.broker import (
    BrokerEntry,
    BrokerSnapshot,
    SnapshotStatus,
    Stock,
)
from app.services.broker_crawlers import (
    BsrFailureReason,
    analyze_broker_full_ex,
    analyze_tpex_broker_full_ex,
)

# 把 crawler 給的 reason code 翻成中文錯誤訊息給 UI 顯示
_REASON_MESSAGES = {
    BsrFailureReason.NO_DATA: "BSR 站回查無資料(該股當日無分點明細,可能停牌或非交易日)",
    BsrFailureReason.CAPTCHA_EXHAUSTED: "驗證碼重試耗盡(8 次仍無法通過 OCR);可按重新抓取",
    BsrFailureReason.NETWORK_ERROR: "連線 BSR 站失敗",
    BsrFailureReason.PARSE_EMPTY: "BSR 回應已收到但解析為空",
    BsrFailureReason.UNKNOWN: "未知錯誤",
}

logger = logging.getLogger(__name__)

TPE = timezone(timedelta(hours=8))


# ════════════════════════════════════════════════════════════
# Repo
# ════════════════════════════════════════════════════════════
async def get_or_create_stock(
    db: AsyncSession, code: str, *, name: str = "", market: str = "",
) -> Stock:
    res = await db.execute(select(Stock).where(Stock.code == code))
    stock = res.scalars().first()
    if stock is None:
        stock = Stock(code=code, name=name, market=market)
        db.add(stock)
        await db.flush()
    else:
        # 補/修資料:
        #   - name 之前可能空,有給就補
        #   - market 改成「有給且跟既有不同」就 overwrite — 修舊版被錯標的 case
        #     (例如舊版抓 1595 時 market 寫成 'twse' 或空,新版要能 fix 成 'tpex')
        changed = False
        if name and stock.name != name:
            stock.name = name
            changed = True
        if market and stock.market != market:
            stock.market = market
            changed = True
        if changed:
            await db.flush()
    return stock


async def get_snapshot(
    db: AsyncSession, code: str, trade_date: date | None = None,
) -> BrokerSnapshot | None:
    """trade_date=None 時，取該股最新一份 snapshot。"""
    q = (
        select(BrokerSnapshot)
        .join(Stock)
        .where(Stock.code == code)
    )
    if trade_date is not None:
        q = q.where(BrokerSnapshot.trade_date == trade_date)
    q = q.order_by(BrokerSnapshot.trade_date.desc()).limit(1)
    res = await db.execute(q)
    return res.scalars().first()


async def upsert_snapshot_pending(
    db: AsyncSession, code: str, trade_date: date,
    *, name: str = "", market: str = "",
) -> BrokerSnapshot:
    """確保 (code, trade_date) 有一筆 snapshot；不存在則新建 pending。

    若已存在（無論狀態）回傳該筆，呼叫端再決定要不要重抓。
    """
    stock = await get_or_create_stock(db, code, name=name, market=market)

    res = await db.execute(
        select(BrokerSnapshot).where(
            BrokerSnapshot.stock_id == stock.id,
            BrokerSnapshot.trade_date == trade_date,
        )
    )
    snap = res.scalars().first()
    if snap is None:
        snap = BrokerSnapshot(
            stock_id=stock.id, trade_date=trade_date,
            status=SnapshotStatus.PENDING,
        )
        db.add(snap)
        await db.flush()
    return snap


def _f(v) -> float | None:
    """Coerce pandas/numpy scalar → float;NaN/None 都回 None。

    pandas.DataFrame.to_dict() 留下 numpy.float64,直送 aiosqlite 的 Numeric column
    在某些版本會以「DB write failed」噴掉。一律走 float() 轉成 Python 原生。
    """
    if v is None:
        return None
    try:
        f = float(v)
        if f != f:  # NaN
            return None
        return f
    except (TypeError, ValueError):
        return None


def _i(v) -> int:
    """Coerce → int (None / NaN → 0)。"""
    f = _f(v)
    return int(f) if f is not None else 0


async def upsert_snapshot_ok(
    db: AsyncSession, snapshot_id: int, payload: dict,
) -> None:
    """把 analyze_broker_full() 的結果寫入 DB。

    - 更新 snapshot 狀態為 ok 並寫入 OHLC + summary
    - 清空舊 entries,重新寫入全部分點 + 排名(rank_in_buy / rank_in_sell)
    - 所有 numeric 值統一過 _f / _i,避免 pandas 的 numpy.float64 撞 aiosqlite
    """
    res = await db.execute(
        select(BrokerSnapshot).where(BrokerSnapshot.id == snapshot_id)
    )
    snap = res.scalars().first()
    if snap is None:
        logger.warning("upsert_snapshot_ok: snapshot %s gone", snapshot_id)
        return

    p = payload.get("price") or {}
    s = payload.get("summary") or {}
    snap.status = SnapshotStatus.OK
    snap.error = None
    snap.open = _f(p.get("open"))
    snap.high = _f(p.get("high"))
    snap.low = _f(p.get("low"))
    snap.close = _f(p.get("close"))
    snap.total_records = _i(s.get("total_records"))
    snap.total_brokers = _i(s.get("total_brokers"))

    # 清舊 entries
    await db.execute(delete(BrokerEntry).where(BrokerEntry.snapshot_id == snap.id))

    all_entries = payload.get("all") or []
    if not all_entries:
        await db.flush()
        return

    # 預先算排名:net 由大到小 = 買超排名;由小到大 = 賣超排名
    sorted_by_buy = sorted(all_entries, key=lambda e: _f(e.get("net")) or 0, reverse=True)
    sorted_by_sell = sorted(all_entries, key=lambda e: _f(e.get("net")) or 0)
    buy_rank_map = {
        e["broker_code"]: i + 1
        for i, e in enumerate(sorted_by_buy)
        if (_f(e.get("net")) or 0) > 0
    }
    sell_rank_map = {
        e["broker_code"]: i + 1
        for i, e in enumerate(sorted_by_sell)
        if (_f(e.get("net")) or 0) < 0
    }

    # 防呆 dedup: 即使源頭出 bug,同 snapshot 內同 broker_code 也只寫第一筆。
    # 撞 UNIQUE(snapshot_id, broker_code) 會讓整個 commit rollback,寧可丟資料也不要整檔失敗。
    seen_codes: set[str] = set()
    duplicate_count = 0
    for e in all_entries:
        code = str(e["broker_code"])
        if code in seen_codes:
            duplicate_count += 1
            continue
        seen_codes.add(code)
        db.add(BrokerEntry(
            snapshot_id=snap.id,
            broker_code=code,
            broker_name=str(e.get("broker_name", "")),
            net=_f(e.get("net")) or 0,
            buy=_f(e.get("buy")) or 0,
            sell=_f(e.get("sell")) or 0,
            buy_avg=_f(e.get("buy_avg")),
            sell_avg=_f(e.get("sell_avg")),
            rank_in_buy=buy_rank_map.get(code),
            rank_in_sell=sell_rank_map.get(code),
        ))
    if duplicate_count:
        logger.warning(
            "upsert_snapshot_ok: snapshot=%s dropped %d dup broker_code rows",
            snap.id, duplicate_count,
        )
    await db.flush()


async def mark_failed(db: AsyncSession, snapshot_id: int, error: str) -> None:
    res = await db.execute(select(BrokerSnapshot).where(BrokerSnapshot.id == snapshot_id))
    snap = res.scalars().first()
    if snap is None:
        return
    snap.status = SnapshotStatus.FAILED
    snap.error = error[:1000]  # 截長
    await db.flush()


# 不可重試的失敗訊息片段(BSR 真的沒資料 / 解析空) — 重試也是同樣結果
_NON_RETRYABLE_ERROR_HINTS = (
    "查無",          # NO_DATA: BSR 站明確回查無資料
    "無分點",         # NO_DATA: 「該日期無分點快照」(歷史日期)
    "解析為空",       # PARSE_EMPTY
    "parsed empty",  # 備用英文版本
)


def _is_retryable_failure(error: str | None) -> bool:
    """判斷一筆 failed snapshot 是否值得自動重試。

    可重試 = 暫時性失敗(網路斷、驗證碼解不出、超時、DB lock 等)
    不可重試 = BSR 端明確說沒資料 / 解析結果空(就算重抓也一樣)
    """
    if not error:
        return True  # 沒寫原因預設可重試
    return not any(hint in error for hint in _NON_RETRYABLE_ERROR_HINTS)


async def list_today_failed_retryable() -> list[dict]:
    """列出今日(Asia/Taipei)所有「值得重試」的 failed snapshots。

    給 scheduler 的 retry job 用。回傳 [{code, name, market}] 給 batch_schedule 吃。
    """
    today = datetime.now(TPE).date()
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(BrokerSnapshot, Stock)
            .join(Stock, Stock.id == BrokerSnapshot.stock_id)
            .where(
                BrokerSnapshot.trade_date == today,
                BrokerSnapshot.status == SnapshotStatus.FAILED,
            )
        )
        rows = res.all()

    out: list[dict] = []
    for snap, stock in rows:
        if _is_retryable_failure(snap.error):
            out.append({"code": stock.code, "name": stock.name, "market": stock.market})
    return out


async def list_today_broken_ok() -> list[dict]:
    """列出今日 status=ok 但內容明顯壞掉的 snapshot — 需要強制重抓。

    壞掉判定(命中任一即視為壞):
      1. broker_name == broker_code 比例 ≥ 50%  — 舊 parser nested table bug
      2. buy 總和 != sell 總和(BSR 內部買賣股數必相等的 invariant)
      3. 所有 entries 的 buy == 0 AND sell == 0

    回傳 [{code, name, market}] 給 force_recrawl 用。
    """
    today = datetime.now(TPE).date()
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(BrokerSnapshot, Stock)
            .join(Stock, Stock.id == BrokerSnapshot.stock_id)
            .where(
                BrokerSnapshot.trade_date == today,
                BrokerSnapshot.status == SnapshotStatus.OK,
            )
        )
        snapshots = res.all()

    out: list[dict] = []
    async with AsyncSessionLocal() as db:
        for snap, stock in snapshots:
            r = await db.execute(
                select(
                    BrokerEntry.broker_code,
                    BrokerEntry.broker_name,
                    BrokerEntry.buy,
                    BrokerEntry.sell,
                )
                .where(BrokerEntry.snapshot_id == snap.id)
            )
            entries = r.all()
            n = len(entries)
            if n < 5:
                # 太少筆數可能是該股當日真的沒人交易,別誤判
                continue

            same_count = sum(1 for code, name, _, _ in entries if (name or "") == code)
            buy_sum = sum(float(buy or 0) for _, _, buy, _ in entries)
            sell_sum = sum(float(sell or 0) for _, _, _, sell in entries)
            all_zero = all((float(b or 0) == 0 and float(s or 0) == 0) for _, _, b, s in entries)

            broken = (
                (same_count / n) >= 0.5
                or abs(buy_sum - sell_sum) > 0.01
                or all_zero
            )
            if broken:
                logger.info(
                    "broken-ok detected: %s — entries=%d same_name_ratio=%.2f buy_sum=%.1f sell_sum=%.1f",
                    stock.code, n, same_count / n, buy_sum, sell_sum,
                )
                out.append({"code": stock.code, "name": stock.name, "market": stock.market})

    return out


async def list_today_stuck_pending(min_age_minutes: int = 5) -> list[dict]:
    """列出今日 status=pending 但停留超過 N 分鐘的 snapshot — 通常是孤兒 (orphan)。

    成因:backend container 重啟時,正在跑的 background task 被 kill,
    DB 內 snapshot 留 pending 但沒人接續,前端永遠輪詢看到 pending。
    retry job 或 startup hook 拿這個清單重新 schedule_crawl。

    min_age_minutes 預設 5 分鐘 (典型抓取 < 4 分鐘);調太小會誤殺正在跑的。
    """
    today = datetime.now(TPE).date()
    cutoff = datetime.now(TPE) - timedelta(minutes=min_age_minutes)
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(BrokerSnapshot, Stock)
            .join(Stock, Stock.id == BrokerSnapshot.stock_id)
            .where(
                BrokerSnapshot.trade_date == today,
                BrokerSnapshot.status == SnapshotStatus.PENDING,
                BrokerSnapshot.fetched_at < cutoff,
            )
        )
        rows = res.all()
    return [
        {"code": s.code, "name": s.name, "market": s.market}
        for _snap, s in rows
    ]


async def list_today_non_ok() -> list[dict]:
    """列出今日所有 status != ok 的 snapshot(failed 不論原因 + pending 卡死)。

    比 list_today_failed_retryable 更積極,不過濾 error reason。
    用於部署新版 parser / crawler 後,使用者想一次清掉所有非 ok 的 snapshot。
    """
    today = datetime.now(TPE).date()
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(BrokerSnapshot, Stock)
            .join(Stock, Stock.id == BrokerSnapshot.stock_id)
            .where(
                BrokerSnapshot.trade_date == today,
                BrokerSnapshot.status != SnapshotStatus.OK,
            )
        )
        rows = res.all()
    return [
        {"code": s.code, "name": s.name, "market": s.market}
        for _snap, s in rows
    ]


async def force_recrawl(code: str, *, name: str = "", market: str = "") -> str:
    """強制重抓單檔 — 把今日 snapshot 改 pending 後再排背景抓。

    用於:
      - 舊 parser 寫的 ok 但壞掉的資料(broker_name == code 等)
      - 使用者按 重新抓取 button(refresh 端點背後也用這個)
    """
    today = datetime.now(TPE).date()
    async with AsyncSessionLocal() as db:
        snap = await get_snapshot(db, code, today)
        if snap is not None:
            snap.status = SnapshotStatus.PENDING
            snap.error = None
            await db.commit()

    return await schedule_crawl(code, name=name, market=market)


async def fetch_top(
    db: AsyncSession, snapshot_id: int, n: int = 15,
) -> tuple[list[BrokerEntry], list[BrokerEntry], list[BrokerEntry]]:
    """回傳 (buy_top, sell_top, all) 三組 entries。"""
    res = await db.execute(
        select(BrokerEntry).where(BrokerEntry.snapshot_id == snapshot_id)
        .order_by(BrokerEntry.rank_in_buy.asc().nulls_last(), BrokerEntry.net.desc())
    )
    all_entries = list(res.scalars().all())

    buy_top = sorted(
        [e for e in all_entries if e.rank_in_buy is not None],
        key=lambda e: e.rank_in_buy,
    )[:n]
    sell_top = sorted(
        [e for e in all_entries if e.rank_in_sell is not None],
        key=lambda e: e.rank_in_sell,
    )[:n]
    return buy_top, sell_top, all_entries


# ════════════════════════════════════════════════════════════
# Crawl Orchestrator
# ════════════════════════════════════════════════════════════
_sem = asyncio.Semaphore(1)                       # 一次只抓一檔
# 原本 Semaphore(2) 在 SQLite 下會撞 "database is locked"(兩個寫者搶鎖);
# 即使開 WAL,把抓取序列化也能讓 BSR 站不被太頻繁打 IP-rate-limit。
_in_flight: set[tuple[str, date]] = set()          # (code, trade_date) 入隊 dedup
_bg_tasks: set[asyncio.Task] = set()                # 持有 task ref 避免 GC

# 單檔最壞耗時上限 — 給 asyncio.wait_for 用。
# BSR site 配 OCR 一次嘗試 ~17 秒,設 240 秒約等於 14 次重試的緩衝。
# 比 ddddocr 預設 max_retry=20(可能 5-15 分鐘)積極許多,避免前端輪詢逾時。
CRAWL_TIMEOUT_S = 240
# BSR 內部重試次數;從預設 20 降到 8 加快失敗回報
BSR_MAX_RETRY = 8


async def _safe_mark_failed(snapshot_id: int | None, message: str) -> None:
    """獨立寫 fail 狀態 — 給 outer except / finally 用,本身永不拋。"""
    if snapshot_id is None:
        return
    try:
        async with AsyncSessionLocal() as db:
            await mark_failed(db, snapshot_id, message[:1000])
            await db.commit()
    except Exception:  # noqa: BLE001
        logger.exception("_safe_mark_failed: secondary failure")


async def _crawl_one(code: str, name: str, market: str) -> None:
    """單檔抓取流程(在背景 task 跑)。

    任何情況下,只要 snapshot 已建立,離開本函式時 status 一定不會是 pending:
    成功 → ok / 失敗 → failed / 超時 → failed("crawl timeout") / 程式異常 → failed("internal error")
    """
    today = datetime.now(TPE).date()
    key = (code, today)
    if key in _in_flight:
        logger.info("crawl skipped (in-flight): %s", code)
        return
    _in_flight.add(key)

    snapshot_id: int | None = None
    try:
        # 1. 在 sema 之前先建 pending snapshot,讓 UI 馬上能看到狀態
        try:
            async with AsyncSessionLocal() as db:
                snap = await upsert_snapshot_pending(
                    db, code, today, name=name, market=market,
                )
                # 若已是 ok 且當天的,就不重抓
                if snap.status == SnapshotStatus.OK:
                    logger.info("crawl skipped (already ok today): %s", code)
                    await db.commit()
                    return
                snap.status = SnapshotStatus.PENDING
                snap.error = None
                snapshot_id = snap.id
                await db.commit()
        except Exception:  # noqa: BLE001
            logger.exception("crawl bootstrap failed: %s", code)
            return

        # 2. 真正抓取(限制並發 + 整體超時)
        # 依 market 路由:tpex → Camoufox CSV;其他 (twse / 空) → TWSE BSR
        payload = None
        error_msg: str | None = None
        is_tpex = (market or "").lower() == "tpex"
        async with _sem:
            logger.info(
                "crawl start: %s market=%s (timeout=%ds, max_retry=%d)",
                code, market or "twse", CRAWL_TIMEOUT_S, BSR_MAX_RETRY,
            )
            try:
                if is_tpex:
                    # TPEX Camoufox 是 async,不需 to_thread
                    payload, reason = await asyncio.wait_for(
                        analyze_tpex_broker_full_ex(code, max_retry=3),
                        timeout=CRAWL_TIMEOUT_S,
                    )
                else:
                    # TWSE BSR 是 sync(requests + ddddocr),用 thread 卸下
                    payload, reason = await asyncio.wait_for(
                        asyncio.to_thread(analyze_broker_full_ex, code, BSR_MAX_RETRY),
                        timeout=CRAWL_TIMEOUT_S,
                    )
                if payload is None:
                    error_msg = _REASON_MESSAGES.get(reason or "", "資料來源回空")
                    logger.info("crawl no payload: %s reason=%s", code, reason)
            except asyncio.TimeoutError:
                logger.warning("crawl timeout (>%ds): %s", CRAWL_TIMEOUT_S, code)
                error_msg = f"抓取超時 (>{CRAWL_TIMEOUT_S}s)"
            except Exception as e:  # noqa: BLE001
                logger.exception("crawl raised: %s", code)
                error_msg = f"{type(e).__name__}: {e}"

        # 3. 寫結果
        try:
            async with AsyncSessionLocal() as db:
                if payload is None:
                    await mark_failed(db, snapshot_id, error_msg or "no data")
                else:
                    # BSR 回傳的 trade_date 若不是 today(例如非交易日仍回最後一日)
                    # 仍寫進原 today snapshot,避免重複行
                    await upsert_snapshot_ok(db, snapshot_id, payload)
                await db.commit()
            logger.info("crawl done: %s -> %s", code, "ok" if payload else "failed")
        except Exception:  # noqa: BLE001
            logger.exception("crawl writeback failed: %s", code)
            await _safe_mark_failed(snapshot_id, "DB write failed")
    except Exception:  # noqa: BLE001
        # 兜底:確保任何 unexpected error 都不會讓 snapshot 永久卡 pending
        logger.exception("crawl outer failure: %s", code)
        await _safe_mark_failed(snapshot_id, "internal error")
    finally:
        _in_flight.discard(key)


async def schedule_crawl(
    code: str, *, name: str = "", market: str = "",
) -> str:
    """進入點:把單檔丟去背景抓,回傳此 (code, today) 的目前狀態文字。

    回傳值:
      'pending'         → 剛入隊或正在跑
      'already_ok'      → 今日已有 ok snapshot,沒重抓
      'already_pending' → 正在處理中

    market 自動補:沒給時從 Stock 表查(batch_schedule 跑過後 Stock 已 warm),
    讓 _crawl_one 能正確路由到 TWSE BSR 或 TPEX Camoufox。
    """
    today = datetime.now(TPE).date()

    async with AsyncSessionLocal() as db:
        snap = await get_snapshot(db, code, today)
        if snap and snap.status == SnapshotStatus.OK:
            return "already_ok"
        if (code, today) in _in_flight:
            return "already_pending"

    # market 解析優先序:
    #   1. 呼叫端傳入(前端 BrokerSection 一定知道,最權威)
    #   2. 今日 daily_limit_up_snapshot(該日的官方 market 分類,比 Stock 新)
    #   3. Stock 表(可能 stale)
    # 這個順序是因為:舊版 Stock 可能誤標(例如 1595 上櫃股被標 'twse'),
    # 而 daily snapshot 是當日從 TWSE/TPEX OpenAPI 重新分類的,可信度最高。
    if not market:
        try:
            from app.services import daily_snapshot_service
            async with AsyncSessionLocal() as db:
                snap_resp = await daily_snapshot_service.get_by_date(db, today)
            if snap_resp:
                for s in snap_resp.stocks:
                    if s.code == code:
                        market = s.market or ""
                        name = name or (s.name or "")
                        break
        except Exception:  # noqa: BLE001
            pass

    if not market or not name:
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(Stock).where(Stock.code == code))
            stock = res.scalars().first()
            if stock:
                market = market or (stock.market or "")
                name = name or (stock.name or "")

    # 持有 task ref 避免 GC;callback 中自動移除
    task = asyncio.create_task(_crawl_one(code, name, market))
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)
    return "pending"


async def batch_schedule(
    items: Iterable[dict],
) -> dict[str, list[str]]:
    """批次排程。items 每項 {code, name, market}。

    回傳分桶：queued / skipped_ok / skipped_pending。
    """
    queued, skipped_ok, skipped_pending = [], [], []
    for item in items:
        code = item["code"]
        result = await schedule_crawl(
            code,
            name=item.get("name", ""),
            market=item.get("market", ""),
        )
        if result == "already_ok":
            skipped_ok.append(code)
        elif result == "already_pending":
            skipped_pending.append(code)
        else:
            queued.append(code)
    return {"queued": queued, "skipped_ok": skipped_ok, "skipped_pending": skipped_pending}
