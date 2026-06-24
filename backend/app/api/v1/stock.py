"""股票相關 API(mounted under /api/stock)。

當日漲停:
  GET  /stock/daily/limit-up?market=all|twse|tpex&date=YYYY-MM-DD
       — date 預設今日;傳歷史日期會從 daily_limit_up_snapshots 讀
  GET  /stock/daily/available-dates
       — 回傳 [{date, total}] 供前端日曆 shouldDisableDate 用
  POST /stock/daily/snapshot
       — 手動觸發「snapshot 今日 live 結果到 DB」(管理用 / 測試)
  POST /stock/daily/sectors/rebuild
       — 強制重建產業對照快取(管理用)

分點券商:
  GET  /stock/daily/brokers/{code}?date=YYYY-MM-DD  — 讀快取;無 + 今日 則排背景抓
  POST /stock/daily/brokers/{code}/refresh          — 強制重抓單檔
  POST /stock/daily/brokers/batch-crawl             — 對今日漲停清單批次排抓
"""
from __future__ import annotations

from datetime import date, datetime, timezone, timedelta
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.broker import BrokerSnapshot, SnapshotStatus, Stock
from app.schemas.broker import (
    BrokerBatchCrawlResponse,
    BrokerEntryOut,
    BrokerSnapshotResponse,
)
from app.schemas.stock import DailyLimitUpResponse
from app.services import broker_service, daily_snapshot_service, stock_daily, stock_sector

router = APIRouter()

TPE = timezone(timedelta(hours=8))


def _today_tpe() -> date:
    return datetime.now(TPE).date()


# ── 當日漲停 ───────────────────────────────────────────────
@router.get("/daily/limit-up", response_model=DailyLimitUpResponse)
async def daily_limit_up(
    market: str = Query("all", pattern="^(all|twse|tpex)$"),
    date: Optional[str] = Query(None, description="YYYY-MM-DD;預設今日,歷史日期走 DB snapshot"),
) -> Any:
    try:
        return await stock_daily.get_daily_limit_up(market=market, date=date)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/daily/available-dates")
async def available_dates(db: AsyncSession = Depends(get_db)) -> dict:
    """前端日曆用:列出 DB 中所有 snapshot 日期(含 total)。

    今日永遠可選(即時抓取),所以前端不用判斷 today 是否在 list 內。
    """
    rows = await daily_snapshot_service.list_available_dates(db)
    return {"dates": rows, "today": _today_tpe().isoformat()}


@router.post("/daily/snapshot")
async def manual_snapshot() -> dict:
    """手動觸發「snapshot 今日 live 結果到 DB」。

    正常情況下 scheduler 會在 14:35 自動跑,此端點是給:
      - 測試環境想立刻有歷史可查
      - 排程沒跑成功時手動補
    """
    return await daily_snapshot_service.save_today_snapshot()


@router.post("/daily/snapshot/{date}/refill-institutionals")
async def refill_institutionals(date: str) -> dict:
    """重抓指定歷史日期的三大法人,in-place 更新該日 snapshot。

    - 只動 foreign / trust / dealer 三欄,price / volume / sector 都不動
    - TWSE 走 T86 歷史端點(date param),TPEX 走 dailyTrade 歷史(best effort)
    - 該日 snapshot 不存在 → 404
    """
    try:
        return await daily_snapshot_service.backfill_institutionals_for_date(date)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/daily/snapshot/refill-institutionals/recent")
async def refill_institutionals_recent(
    days: int = Query(7, ge=1, le=60, description="從今日往回 N 天逐日 backfill;沒 snapshot 的日期 skip"),
) -> dict:
    """一鍵 backfill 過去 N 天的三大法人。

    - days 範圍 1-60
    - 每個日期獨立執行,單天失敗不影響其他天
    - 沒 snapshot 的日期會在結果裡標 status='no_snapshot'
    """
    results = await daily_snapshot_service.backfill_institutionals_range(days)
    summary = {"ok": 0, "no_snapshot": 0, "error": 0}
    for r in results:
        summary[r["status"]] = summary.get(r["status"], 0) + 1
    return {"days_requested": days, "summary": summary, "results": results}


@router.post("/daily/sectors/rebuild")
async def rebuild_sectors() -> dict:
    stock_sector.ensure_loaded(force_rebuild=True)
    return {"status": "ok"}


# ── 分點券商 ───────────────────────────────────────────────
def _entry_to_out(e) -> BrokerEntryOut:
    return BrokerEntryOut(
        broker_code=e.broker_code,
        broker_name=e.broker_name,
        net=float(e.net or 0),
        buy=float(e.buy or 0),
        sell=float(e.sell or 0),
        buy_avg=float(e.buy_avg) if e.buy_avg is not None else None,
        sell_avg=float(e.sell_avg) if e.sell_avg is not None else None,
        rank_in_buy=e.rank_in_buy,
        rank_in_sell=e.rank_in_sell,
    )


def _build_response(stock: Stock, snap: BrokerSnapshot,
                    buy_top, sell_top, all_entries) -> BrokerSnapshotResponse:
    return BrokerSnapshotResponse(
        code=stock.code if stock else "",
        name=stock.name if stock and stock.name else "",
        market=stock.market if stock and stock.market else "",
        trade_date=snap.trade_date if snap else None,
        status=snap.status if snap else SnapshotStatus.PENDING,
        fetched_at=snap.fetched_at if snap else None,
        error=snap.error if snap else None,
        open=float(snap.open) if snap and snap.open is not None else None,
        high=float(snap.high) if snap and snap.high is not None else None,
        low=float(snap.low) if snap and snap.low is not None else None,
        close=float(snap.close) if snap and snap.close is not None else None,
        total_records=snap.total_records if snap else 0,
        total_brokers=snap.total_brokers if snap else 0,
        buyTop=[_entry_to_out(e) for e in buy_top],
        sellTop=[_entry_to_out(e) for e in sell_top],
        all=[_entry_to_out(e) for e in all_entries],
    )


def _parse_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail=f"invalid date: {value}")


@router.get("/daily/brokers/{code}", response_model=BrokerSnapshotResponse)
async def get_brokers(
    code: str,
    date: Optional[str] = Query(None, description="YYYY-MM-DD;預設最新 snapshot,歷史日期不會觸發新抓取"),
    market: Optional[str] = Query(None, description="twse / tpex;前端傳入確保路由正確"),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """讀分點快照。

    - 不帶 date:取該股 latest snapshot;若無則排背景抓今日 → 回 pending
    - 帶 date:固定查那天的 snapshot;查無回 200 + status='failed'(歷史日期不主動爬,因 BSR 只有今日資料)
    """
    target_date = _parse_date(date)
    today = _today_tpe()

    snap = await broker_service.get_snapshot(db, code, target_date)

    # 不存在 snapshot
    if snap is None:
        # 只在 date 是 today 或 沒帶 date 時才觸發背景抓取
        if target_date is None or target_date == today:
            await broker_service.schedule_crawl(code, market=market or "")
            return BrokerSnapshotResponse(code=code, status=SnapshotStatus.PENDING)
        # 歷史日期但 DB 無資料 → 回 failed 讓前端顯示「該日無分點資料」
        return BrokerSnapshotResponse(
            code=code,
            status=SnapshotStatus.FAILED,
            trade_date=target_date,
            error="該日期無分點快照",
        )

    if snap.status == SnapshotStatus.OK:
        buy_top, sell_top, all_entries = await broker_service.fetch_top(db, snap.id, n=15)
        return _build_response(snap.stock, snap, buy_top, sell_top, all_entries)

    return _build_response(snap.stock, snap, [], [], [])


@router.post("/daily/brokers/{code}/refresh", response_model=BrokerSnapshotResponse)
async def refresh_brokers(
    code: str,
    market: Optional[str] = Query(None, description="twse / tpex;前端傳入確保路由正確"),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """強制重抓單檔。即使今日已是 ok,也會重新抓。歷史日期沒有此語意(BSR 只有今日)。

    market:前端從 DailyStock 直接帶,避免 backend 從可能 stale 的 Stock 表
    猜錯路由(例如舊版誤把上櫃股 1595/3288 標 'twse',導致重抓還是走 TWSE BSR 一直失敗)。
    """
    today = _today_tpe()
    snap = await broker_service.get_snapshot(db, code, today)
    if snap is not None:
        snap.status = SnapshotStatus.PENDING
        snap.error = None
        await db.commit()

    await broker_service.schedule_crawl(code, market=market or "")
    return BrokerSnapshotResponse(code=code, status=SnapshotStatus.PENDING)


@router.post("/daily/brokers/recrawl-broken-today")
async def recrawl_broken_today() -> dict:
    """強制重抓今日「ok 但內容壞掉」的 snapshot 一次性清掉。

    用途:部署新版 parser 後,把舊版寫進去的壞 snapshot
    (broker_name == code、buy/sell 全 0、buy 總和 != sell 總和)
    重新抓取。後續排程器 retry job(每 10 分鐘)也會自動處理,
    這支 API 主要供「想立刻清掉、不想等到下次 retry tick」時用。
    """
    items = await broker_service.list_today_broken_ok()
    queued = []
    for item in items:
        result = await broker_service.force_recrawl(
            item["code"], name=item["name"], market=item["market"],
        )
        if result == "pending":
            queued.append(item["code"])
    return {
        "trade_date": _today_tpe().isoformat(),
        "detected_broken": len(items),
        "requeued": queued,
    }


@router.post("/daily/brokers/recrawl-all-non-ok-today")
async def recrawl_all_non_ok_today() -> dict:
    """強制重抓今日所有「不是 ok」的 snapshot — 比 recrawl-broken-today 更積極。

    範圍涵蓋:
      - status == failed(不論 error 原因,包含原本被歸為「不可重試」的
        PARSE_EMPTY / NO_DATA — 因為這常常是舊版 parser bug 造成的假性永久失敗)
      - status == pending(卡死的)
      - status == ok 但內容壞掉的(同 recrawl-broken-today 邏輯,順便一起清)

    用於部署新版 parser/crawler 後一次清掉所有可疑資料,
    回傳分桶讓使用者知道處理了幾檔。
    """
    non_ok_items = await broker_service.list_today_non_ok()
    broken_ok_items = await broker_service.list_today_broken_ok()

    # 合併 + 去重(同 code 只 force_recrawl 一次)
    seen: set[str] = set()
    all_items: list[dict] = []
    for item in non_ok_items + broken_ok_items:
        if item["code"] not in seen:
            seen.add(item["code"])
            all_items.append(item)

    queued: list[str] = []
    for item in all_items:
        result = await broker_service.force_recrawl(
            item["code"], name=item["name"], market=item["market"],
        )
        if result == "pending":
            queued.append(item["code"])

    return {
        "trade_date": _today_tpe().isoformat(),
        "detected_non_ok": len(non_ok_items),
        "detected_broken_ok": len(broken_ok_items),
        "requeued": queued,
    }


@router.post("/daily/brokers/batch-crawl", response_model=BrokerBatchCrawlResponse)
async def batch_crawl() -> Any:
    """對今日漲停清單批次排程抓取(給 cron / 內建排程器用)。"""
    today = _today_tpe()
    daily_resp = await stock_daily.get_daily_limit_up(market="all")
    items = [{"code": s.code, "name": s.name, "market": s.market} for s in daily_resp.stocks]
    if not items:
        raise HTTPException(status_code=404, detail="今日沒有漲停股")
    result = await broker_service.batch_schedule(items)
    return BrokerBatchCrawlResponse(trade_date=today, **result)
