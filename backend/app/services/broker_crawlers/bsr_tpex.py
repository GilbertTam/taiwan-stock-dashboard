"""TPEX(上櫃)分點券商抓取器 — 用 Camoufox 過 Cloudflare 取得 CSV。

對外只有一個 entry point,介面與 bsr_twse.analyze_broker_full_ex 一致:
    analyze_tpex_broker_full_ex(stock_id, max_retry=3) -> (payload, reason)

回傳結構跟 TWSE BSR 對齊,讓 broker_service 不用分 if/else 處理:
    {
      "stock_id":   "6488",
      "stock_name": "",          # CSV 沒帶名稱,留空由上層 enrich
      "trade_date": date | None, # 從 filename 推或 None
      "price":      {open, high, low, close},  # CSV 不含,全 None
      "summary":    {total_records, total_brokers},
      "all":        [ {broker_code, broker_name, net, buy, sell, buy_avg, sell_avg}, ... ]
    }

設計:
  - 全 process 共用一個 browser context 跟 page,避免每檔重啟瀏覽器(重啟單檔
    > 30 秒,瀏覽器熱還能複用就 5-10 秒)
  - 用 asyncio.Lock 序列化:同時只有一檔在抓
  - Cloudflare 通過後可以連抓多檔不再撞檢查

依賴:camoufox(自帶 patched Firefox + Playwright)、pandas

注意:
  - Camoufox 第一次 import 時要先 `python -m camoufox fetch` 下載 Firefox bin
    (Dockerfile build 期間應該跑一次)
  - TPEX 站點 5 秒/檔 throttle 比 TWSE BSR 嚴格
"""
from __future__ import annotations

import asyncio
import io
import logging
import re
from datetime import date, datetime
from pathlib import Path
from typing import Optional

import pandas as pd

from app.services.broker_crawlers.bsr_twse import BsrFailureReason

logger = logging.getLogger(__name__)

# TPEX 頁面 + 互動參數
TPEX_BROKER_URL = "https://www.tpex.org.tw/zh-tw/mainboard/trading/info/brokerBS.html"
TIMEOUT_GOTO_MS = 60_000
TIMEOUT_SELECTOR_MS = 30_000
TIMEOUT_DOWNLOAD_MS = 45_000
TIMEOUT_CLOUDFLARE_S = 30
DELAY_AFTER_INPUT_S = 2.0
DELAY_BETWEEN_STOCKS_S = 5.0


# ── 全 process 共享的 browser session ────────────────────────────
# 第一次抓會啟動 Camoufox(~5-8 秒);後續抓共用,單檔只要 ~5-10 秒。
_browser_lock = asyncio.Lock()
_browser_ctx = None  # AsyncCamoufox manager
_browser = None      # 開啟的瀏覽器
_page = None         # 共用 page
_session_ready = False
_last_use_time: float = 0.0
_SESSION_TTL_S = 300  # 5 分鐘沒用就關掉重來,避免 page 卡住


def _camoufox_os() -> str:
    """Camoufox fingerprint OS 跟著 host 走 — 跨平台一致避免 server 偵測。

    本機 dev 上 (Darwin) 用 'macos';Docker container (Linux) 用 'linux'。
    Camoufox 文件:fingerprint OS 跟 host OS 不一致時 patched Firefox 行為會怪
    (Cloudflare 可能也會更積極攔)。
    """
    import sys
    if sys.platform == "darwin":
        return "macos"
    if sys.platform == "win32":
        return "windows"
    return "linux"


async def _ensure_session() -> bool:
    """確保 browser + page 都活著且 Cloudflare 已通過。回 True 表示可以開始抓。"""
    global _browser_ctx, _browser, _page, _session_ready, _last_use_time

    import time as _time
    now = _time.monotonic()

    # 超過 TTL → 重建 session(避免 page 卡死狀態)
    if _session_ready and (now - _last_use_time) > _SESSION_TTL_S:
        logger.info("TPEX: session expired (>%ds idle), recreating", _SESSION_TTL_S)
        await _close_session()

    if _session_ready and _page is not None:
        _last_use_time = now
        return True

    try:
        from camoufox.async_api import AsyncCamoufox
    except ImportError:
        logger.error("camoufox not installed; TPEX broker fetch unavailable")
        return False

    try:
        _browser_ctx = AsyncCamoufox(
            headless=True,
            geoip=False,
            locale="zh-TW",
            os=_camoufox_os(),
        )
        _browser = await _browser_ctx.__aenter__()
        _page = await _browser.new_page()

        logger.info("TPEX: opening %s", TPEX_BROKER_URL)
        try:
            await _page.goto(
                TPEX_BROKER_URL,
                wait_until="domcontentloaded",
                timeout=TIMEOUT_GOTO_MS,
            )
        except Exception as e:  # noqa: BLE001
            logger.warning("TPEX: goto error: %s", e)

        await asyncio.sleep(5)

        # 過 Cloudflare(若有)
        title = await _page.title()
        logger.info("TPEX: page title: %s", title)
        if "just a moment" in title.lower() or "cloudflare" in title.lower():
            logger.info("TPEX: Cloudflare challenge detected, waiting up to %ds", TIMEOUT_CLOUDFLARE_S)
            for _ in range(TIMEOUT_CLOUDFLARE_S):
                await asyncio.sleep(1)
                t = await _page.title()
                if "just a moment" not in t.lower() and "cloudflare" not in t.lower():
                    logger.info("TPEX: passed Cloudflare, title=%s", t)
                    break
            else:
                logger.error("TPEX: Cloudflare not passed within %ds", TIMEOUT_CLOUDFLARE_S)
                await _close_session()
                return False

        # 等輸入框出來
        await _page.wait_for_selector('input[name="code"]', timeout=TIMEOUT_SELECTOR_MS)
        _session_ready = True
        _last_use_time = now
        logger.info("TPEX: session ready")
        return True
    except Exception:  # noqa: BLE001
        logger.exception("TPEX: failed to bootstrap browser session")
        await _close_session()
        return False


async def _close_session() -> None:
    global _browser_ctx, _browser, _page, _session_ready
    try:
        if _browser_ctx is not None:
            await _browser_ctx.__aexit__(None, None, None)
    except Exception:  # noqa: BLE001
        logger.exception("TPEX: session close failed")
    _browser_ctx = None
    _browser = None
    _page = None
    _session_ready = False


# ── CSV 解析 ────────────────────────────────────────────────────
def _to_int(s) -> int:
    try:
        s2 = str(s).replace(",", "").strip()
        return int(s2) if s2 and s2 not in ("--", "-") else 0
    except (ValueError, TypeError):
        return 0


def _to_float(s) -> float:
    try:
        s2 = str(s).replace(",", "").strip()
        return float(s2) if s2 and s2 not in ("--", "-") else 0.0
    except (ValueError, TypeError):
        return 0.0


def _wavg(weights: list[float], values: list[float]) -> float:
    total = sum(weights)
    if total <= 0:
        return 0.0
    return round(sum(w * v for w, v in zip(weights, values)) / total, 2)


def _parse_tpex_csv(csv_bytes: bytes) -> Optional[pd.DataFrame]:
    """嘗試 UTF-8 → BIG5 → CP950 自動偵測 + 解析 TPEX 分點 CSV。

    CSV 結構(觀察):前 2 行是 metadata(交易日 / 股票名稱),第 3 行才是欄位 header。
    欄位含「序號、券商代號、券商名稱、成交單價、買進股數、賣出股數」(欄名可能有空白)。
    """
    last_err: Optional[Exception] = None
    for enc in ("utf-8-sig", "big5", "cp950"):
        try:
            df = pd.read_csv(io.BytesIO(csv_bytes), encoding=enc, skiprows=2)
            df = df.dropna(how="all")
            df.columns = df.columns.astype(str).str.strip()
            return df
        except Exception as e:  # noqa: BLE001
            last_err = e
            continue
    if last_err:
        logger.warning("TPEX: parse CSV failed for all encodings: %s", last_err)
    return None


def _normalize_tpex_df(df: pd.DataFrame) -> Optional[pd.DataFrame]:
    """把 TPEX CSV 統一成 broker_code / broker_name / price / buy_shares / sell_shares。

    實際觀察到的 TPEX CSV header:
        ['序號', '券商', '價格', '買進股數', '賣出股數']
    其中「券商」一欄是「代號 名稱」格式(如 '9268 凱基台北')、合在一起,需 split。
    部分子分點可能只有代號沒名稱(name = code 當 fallback)。
    """
    if df is None or df.empty:
        return None

    # 找各欄(用較寬鬆關鍵字)
    broker_col = None
    name_col = None
    price_col = None
    buy_col = None
    sell_col = None
    for col in df.columns:
        c = str(col)
        cl = c.lower()
        if broker_col is None and ("券商" in c or re.fullmatch(r"代[號碼]", c) or "broker" in cl):
            broker_col = col
        elif name_col is None and ("名稱" in c and broker_col != col):
            name_col = col
        elif price_col is None and ("單價" in c or "價格" in c or "price" in cl):
            price_col = col
        elif buy_col is None and "買進" in c:
            buy_col = col
        elif sell_col is None and "賣出" in c:
            sell_col = col

    if not all([broker_col, price_col, buy_col, sell_col]):
        logger.warning("TPEX: normalize failed, columns=%s", df.columns.tolist())
        return None

    # 從「券商」欄拆出 code + name(可能是 '9268 凱基台北' 或 '9268')
    def _split_broker(raw):
        s = str(raw).replace('　', ' ').strip()
        m = re.match(r'^([A-Za-z0-9]{4,})\s+(.+)$', s)
        if m:
            return m.group(1), m.group(2).strip()
        m2 = re.match(r'^([A-Za-z0-9]{4,})$', s)
        if m2:
            return m2.group(1), m2.group(1)
        return None, None

    broker_split = df[broker_col].apply(_split_broker)
    codes = broker_split.apply(lambda x: x[0])
    names_from_broker = broker_split.apply(lambda x: x[1])
    # 若有獨立名稱欄優先取它,沒有就用 split 出來的
    names = df[name_col].astype(str).str.strip() if name_col else names_from_broker

    out = pd.DataFrame({
        "broker_code": codes,
        "broker_name": names,
        "price": df[price_col].apply(_to_float),
        "buy_shares": df[buy_col].apply(_to_int),
        "sell_shares": df[sell_col].apply(_to_int),
    })

    # 過濾不像 broker code 的列(合計列、空白等)
    out = out.dropna(subset=["broker_code"])
    out = out[out["broker_code"].astype(str).str.match(r"^[A-Za-z0-9]{4,}$")].reset_index(drop=True)
    return out if not out.empty else None


def _build_summary(df: pd.DataFrame) -> pd.DataFrame:
    """同 bsr_twse._calc_summary — groupby('broker_code') + 加權均價;name 取第一個非空。"""
    name_map = (df.groupby("broker_code")["broker_name"]
                  .agg(lambda s: next((x for x in s if x), s.iloc[0]))
                  .to_dict())

    grouped = (df.groupby("broker_code", as_index=False)
                 .agg(buy_shares=("buy_shares", "sum"),
                      sell_shares=("sell_shares", "sum")))
    grouped["broker_name"] = grouped["broker_code"].map(name_map).fillna(grouped["broker_code"])
    grouped["net"] = (grouped["buy_shares"] - grouped["sell_shares"]) / 1000
    grouped["buy"] = grouped["buy_shares"] / 1000
    grouped["sell"] = grouped["sell_shares"] / 1000

    def _avg(sub, weight_col):
        weights = sub[weight_col].tolist()
        prices = sub["price"].tolist()
        return _wavg(weights, prices)

    buy_avgs = df.groupby("broker_code").apply(lambda s: _avg(s, "buy_shares"))
    sell_avgs = df.groupby("broker_code").apply(lambda s: _avg(s, "sell_shares"))
    grouped["buy_avg"] = grouped["broker_code"].map(buy_avgs)
    grouped["sell_avg"] = grouped["broker_code"].map(sell_avgs)

    return (grouped[["broker_code", "broker_name", "net", "buy", "sell", "buy_avg", "sell_avg"]]
            .round(2)
            .sort_values("net", ascending=False)
            .reset_index(drop=True))


# ── 主流程 ─────────────────────────────────────────────────────
async def _download_csv(stock_id: str) -> Optional[bytes]:
    """在 _page 上輸入股號 + 按下載 + 拿 CSV bytes。失敗回 None。"""
    if _page is None:
        return None
    try:
        await _page.fill('input[name="code"]', "")
        await asyncio.sleep(0.3)
        await _page.type('input[name="code"]', stock_id, delay=80)
        await asyncio.sleep(DELAY_AFTER_INPUT_S)

        # 優先 UTF-8
        try:
            async with _page.expect_download(timeout=TIMEOUT_DOWNLOAD_MS) as dl_info:
                await _page.click('button:has-text("下載 CSV (UTF-8)")')
            download = await dl_info.value
            path = await download.path()
            return Path(path).read_bytes()
        except Exception as e1:  # noqa: BLE001
            logger.info("TPEX %s: UTF-8 download failed (%s), trying BIG5", stock_id, e1)

        # Fallback BIG5
        async with _page.expect_download(timeout=TIMEOUT_DOWNLOAD_MS) as dl_info:
            await _page.click('button:has-text("下載 CSV (BIG5)")')
        download = await dl_info.value
        path = await download.path()
        return Path(path).read_bytes()
    except Exception as e:  # noqa: BLE001
        logger.warning("TPEX %s: download failed: %s", stock_id, e)
        return None


async def analyze_tpex_broker_full_ex(
    stock_id: str, max_retry: int = 3,
) -> tuple[Optional[dict], Optional[str]]:
    """對外入口 — 跟 TWSE BSR 同介面。成功:(payload, None);失敗:(None, reason)。

    每次嘗試:
      1. 確保 browser session 還活著(必要時開新瀏覽器 + 過 Cloudflare)
      2. 在 _browser_lock 內輸入股號 + 下載 CSV
      3. 解析 CSV → groupby summary
    任一步失敗就重試,reason 取最後一次的代碼。
    """
    last_reason = BsrFailureReason.UNKNOWN

    for attempt in range(1, max_retry + 1):
        logger.info("TPEX %s: attempt %d/%d", stock_id, attempt, max_retry)

        async with _browser_lock:
            if not await _ensure_session():
                last_reason = BsrFailureReason.NETWORK_ERROR
                await asyncio.sleep(5)
                continue

            csv_bytes = await _download_csv(stock_id)

        if csv_bytes is None:
            last_reason = BsrFailureReason.NETWORK_ERROR
            await asyncio.sleep(DELAY_BETWEEN_STOCKS_S)
            continue

        # CSV 解析
        df = _parse_tpex_csv(csv_bytes)
        if df is None or df.empty:
            last_reason = BsrFailureReason.NO_DATA
            return None, last_reason

        norm = _normalize_tpex_df(df)
        if norm is None or norm.empty:
            last_reason = BsrFailureReason.PARSE_EMPTY
            return None, last_reason

        summary = _build_summary(norm)
        payload = {
            "stock_id": stock_id,
            "stock_name": "",
            "trade_date": datetime.now().date(),  # CSV 沒帶,用當下日期
            "price": {"open": None, "high": None, "low": None, "close": None},
            "summary": {
                "total_records": int(len(norm)),
                "total_brokers": int(norm["broker_code"].nunique()),
            },
            "all": summary.to_dict(orient="records"),
        }
        return payload, None

    return None, last_reason


async def shutdown_session() -> None:
    """讓上層在 app shutdown 時呼叫,乾淨關掉 browser。"""
    async with _browser_lock:
        await _close_session()
