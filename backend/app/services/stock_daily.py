"""當日漲停資料組裝服務（上市 TWSE + 上櫃 TPEX）。

資料來源（皆為公開、免 API Key、僅最新交易日）：
  上市 TWSE OpenAPI
    - 價量/漲跌：STOCK_DAY_ALL
    - 三大法人：fund/T86
  上櫃 TPEX OpenAPI（https://www.tpex.org.tw/openapi/v1）
    - 價量/漲跌：tpex_mainboard_quotes      （上櫃股票收盤行情）
    - 三大法人：tpex_3insti_daily_trading   （上櫃三大法人買賣明細）
  產業分類：stock_sector.classify()（TWSE 官方 + MoneyDJ）

TPEX 欄位 key 命名官方文件未完整公開，故 TPEX 解析採「候選 key + 子字串啟發式 +
首列未知 key 自我回報(log)」三層防呆，避免靜默產生錯誤數字。若 log 出現
'TPEX quotes: unresolved keys'，把實際 key 補進對應候選清單即可。
"""
from __future__ import annotations

import logging
import math
from collections import Counter
from datetime import datetime, timezone, timedelta

import httpx

from app.schemas.stock import DailyLimitUpResponse, DailyStock, MarketBreakdown, SectorOption
from app.services import stock_sector

logger = logging.getLogger(__name__)

TPE = timezone(timedelta(hours=8))  # Asia/Taipei

# 上市 TWSE
STOCK_DAY_ALL = "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL"
# T86 OpenAPI 已失效(302→404,確認於 2026-06);改用 legacy endpoint,
# 統一走 _fetch_t86_for_date(date) 取資料,date 帶 STOCK_DAY_ALL 回的真實交易日。
# 上櫃 TPEX
TPEX_QUOTES = "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes"
TPEX_3INSTI = "https://www.tpex.org.tw/openapi/v1/tpex_3insti_daily_trading"

# 歷史端點 — 供 backfill 用(支援 date param 拉指定日期的三大法人)
# TWSE legacy: 接受 YYYYMMDD,回傳 {"fields":[...],"data":[[...]]} 或 {"data":[{...}]}
T86_HIST = "https://www.twse.com.tw/rwd/zh/fund/T86"
# TPEX legacy: ROC 年制 YYY/MM/DD (民國);實際 url 變過幾次,best-effort
TPEX_3INSTI_HIST = "https://www.tpex.org.tw/www/zh-tw/insti/dailyTrade"

LIMIT_UP_PCT_FLOOR = 9.5


def _tick(price: float) -> float:
    if price < 10:
        return 0.01
    if price < 50:
        return 0.05
    if price < 100:
        return 0.1
    if price < 500:
        return 0.5
    if price < 1000:
        return 1.0
    return 5.0


def _limit_up_price(prev_close: float) -> float:
    raw = prev_close * 1.1
    t = _tick(raw)
    return round(math.floor(round(raw / t, 6)) * t, 2)


def _to_float(v) -> float | None:
    if v is None:
        return None
    s = str(v).strip().replace(",", "").replace("+", "")
    if s in ("", "--", "X", "N/A", "null", "---"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _to_int(v) -> int:
    f = _to_float(v)
    return int(round(f)) if f is not None else 0


def _first(row: dict, candidates: list[str]):
    for k in candidates:
        if k in row and str(row[k]).strip() not in ("", "--", "---"):
            return row[k]
    return None


def _parse_twse_roc_date(raw) -> str | None:
    """TWSE OpenAPI Date 是民國年 YYYMMDD (例 '1150622' = 115/06/22 = 2026-06-22)。

    回西元 'YYYY-MM-DD';解析失敗回 None。
    """
    if raw is None:
        return None
    s = str(raw).strip()
    if len(s) == 7 and s.isdigit():
        try:
            roc_year = int(s[:3])
            month = int(s[3:5])
            day = int(s[5:7])
            return f"{roc_year + 1911}-{month:02d}-{day:02d}"
        except (ValueError, TypeError):
            return None
    # 也支援已是西元的 'YYYY-MM-DD' 或 'YYYYMMDD'
    if len(s) == 10 and s[4] == "-" and s[7] == "-":
        return s
    if len(s) == 8 and s.isdigit():
        return f"{s[:4]}-{s[4:6]}-{s[6:8]}"
    return None


async def _fetch_json(client: httpx.AsyncClient, url: str) -> list[dict]:
    try:
        r = await client.get(url, timeout=25)
        r.raise_for_status()
        data = r.json()
        return data if isinstance(data, list) else []
    except Exception as e:  # noqa: BLE001
        logger.warning("fetch failed %s: %s", url, e)
        return []


# ── 歷史抓取 (給 backfill 用) ─────────────────────────────────
async def _fetch_t86_for_date(
    client: httpx.AsyncClient, date_str: str,
) -> list[dict]:
    """TWSE T86 歷史:date_str = YYYY-MM-DD,轉成 YYYYMMDD 帶進去。

    legacy 端點回 {"fields": [...], "data": [[...]]};zip 成 list[dict]
    讓 _parse_t86 直接吃。
    """
    date_compact = date_str.replace("-", "")
    url = f"{T86_HIST}?response=json&date={date_compact}&selectType=ALLBUT0999"
    try:
        r = await client.get(url, timeout=25)
        r.raise_for_status()
        data = r.json()
    except Exception as e:  # noqa: BLE001
        logger.warning("fetch T86 historical %s failed: %s", date_str, e)
        return []

    # 兩種格式:legacy = {fields, data};新版 OpenAPI = list of dict
    if isinstance(data, list):
        return data
    fields = data.get("fields") or []
    rows = data.get("data") or []
    if not fields or not rows:
        return []
    return [dict(zip(fields, row)) for row in rows]


async def _fetch_tpex_inst_for_date(
    client: httpx.AsyncClient, date_str: str,
) -> dict[str, dict]:
    """TPEX 三大法人歷史 (best-effort) — 直接回 {code: {foreign, trust, dealer}}。

    TPEX 歷史端點 schema 是「沒 category 名稱的重複欄」,確認後 (用 6488 驗證):
      [0]  代號
      [1]  名稱
      [2-4]   外陸資(不含外資自營商) 買 / 賣 / 買賣超
      [5-7]   外資自營商              買 / 賣 / 買賣超
      [8-10]  外資合計 (= [2-4]+[5-7]) 買 / 賣 / 買賣超   ← foreign 用這個
      [11-13] 投信                    買 / 賣 / 買賣超   ← trust 用 [13]
      [14-16] 自營商-自行              買 / 賣 / 買賣超
      [17-19] 自營商-避險              買 / 賣 / 買賣超
      [20-22] 自營商合計 (= [14-16]+[17-19]) 買 / 賣 / 買賣超  ← dealer 用 [22]
      [23] 三大法人合計-買賣超 (= [10] + [13] + [22])

    foreign = col[10]   (外資合計買賣超)
    trust   = col[13]   (投信買賣超)
    dealer  = col[22]   (自營商合計買賣超)
    單位:股 → 後續 / 1000 → 張

    用 index 取(別用 dict 因為 fields 名稱會重複,dict 會 overwrite)。
    """
    # ROC 年:date_str 是西元,要轉
    try:
        from datetime import datetime
        d = datetime.strptime(date_str, "%Y-%m-%d")
        roc_date = f"{d.year - 1911}/{d.month:02d}/{d.day:02d}"
    except ValueError:
        return {}

    url = f"{TPEX_3INSTI_HIST}?date={roc_date}&type=Daily&id=&response=json"
    try:
        r = await client.get(url, timeout=25)
        r.raise_for_status()
        data = r.json()
    except Exception as e:  # noqa: BLE001
        logger.warning("fetch TPEX inst historical %s failed: %s", date_str, e)
        return {}

    tables = data.get("tables") if isinstance(data, dict) else None
    if not tables:
        return {}
    t0 = tables[0]
    rows = t0.get("data") or []
    if not rows:
        return {}

    out: dict[str, dict] = {}
    for row in rows:
        if not isinstance(row, list) or len(row) < 23:
            continue
        code = str(row[0]).strip() if row[0] is not None else ""
        if not code:
            continue
        try:
            foreign = _to_int(row[10])  # 外資合計買賣超
            trust = _to_int(row[13])    # 投信買賣超
            dealer = _to_int(row[22])   # 自營商合計買賣超
        except (IndexError, TypeError, ValueError):
            continue
        out[code] = {
            "foreign": foreign // 1000,
            "trust": trust // 1000,
            "dealer": dealer // 1000,
        }
    return out


async def fetch_historical_institutionals(date_str: str) -> dict[str, dict]:
    """抓指定日期的 TWSE+TPEX 三大法人,合併成 {code: {foreign, trust, dealer}}。

    - TWSE 走 T86 歷史 (date param) → 經 _parse_t86
    - TPEX 走 dailyTrade 歷史 (ROC 年) → _fetch_tpex_inst_for_date 直接回好 dict
      (因 TPEX 歷史端點 fields 名稱重複沒 category,得用 index 取,不能走通用 _parse_tpex_inst)
    code 是字串。TWSE / TPEX 之間 code 不重疊 (上市 vs 上櫃),直接 merge。
    """
    out: dict[str, dict] = {}
    async with httpx.AsyncClient(headers={"User-Agent": "twstock-dashboard/1.0"}) as client:
        twse_rows = await _fetch_t86_for_date(client, date_str)
        if twse_rows:
            twse_parsed = _parse_t86(twse_rows)
            out.update(twse_parsed)
            logger.info("T86 historical %s: parsed %d stocks", date_str, len(twse_parsed))
        tpex_parsed = await _fetch_tpex_inst_for_date(client, date_str)
        if tpex_parsed:
            out.update(tpex_parsed)
            logger.info("TPEX inst historical %s: parsed %d stocks", date_str, len(tpex_parsed))
    return out


# ── 上市 TWSE 解析 ──────────────────────────────────────────────
def _parse_t86(rows: list[dict]) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for row in rows:
        code = (row.get("證券代號") or row.get("Code") or "").strip()
        if not code:
            continue
        foreign = (
            _to_int(row.get("外陸資買賣超股數(不含外資自營商)"))
            + _to_int(row.get("外資自營商買賣超股數"))
        ) or _to_int(row.get("外資買賣超股數"))
        trust = _to_int(row.get("投信買賣超股數"))
        dealer = _to_int(row.get("自營商買賣超股數")) or (
            _to_int(row.get("自營商買賣超股數(自行買賣)")) + _to_int(row.get("自營商買賣超股數(避險)"))
        )
        out[code] = {"foreign": foreign // 1000, "trust": trust // 1000, "dealer": dealer // 1000}
    return out


def _build_twse_stocks(all_rows: list[dict], inst: dict[str, dict]) -> list[DailyStock]:
    stocks: list[DailyStock] = []
    for row in all_rows:
        code = (row.get("Code") or "").strip()
        name = (row.get("Name") or "").strip()
        close = _to_float(row.get("ClosingPrice"))
        change = _to_float(row.get("Change"))
        shares = _to_int(row.get("TradeVolume"))
        if not code or close is None or change is None:
            continue
        s = _assemble(code, name, "twse", close, change, shares, inst.get(code, {}))
        if s:
            stocks.append(s)
    return stocks


# ── 上櫃 TPEX 解析 ──────────────────────────────────────────────
_TPEX_CODE = ["SecuritiesCompanyCode", "Code", "證券代號", "股票代號", "代號"]
_TPEX_NAME = ["CompanyName", "Name", "公司名稱", "名稱"]
_TPEX_CLOSE = ["Close", "ClosingPrice", "收盤", "收盤價"]
_TPEX_CHANGE = ["Change", "漲跌", "漲跌價差"]
_TPEX_VOL = ["TradingShares", "TradeVolume", "成交股數"]

_tpex_warned = {"quotes": False, "inst": False}


def _build_tpex_stocks(quote_rows: list[dict], inst: dict[str, dict]) -> list[DailyStock]:
    stocks: list[DailyStock] = []
    for row in quote_rows:
        code = _first(row, _TPEX_CODE)
        close = _to_float(_first(row, _TPEX_CLOSE))
        change = _to_float(_first(row, _TPEX_CHANGE))
        if code is None or close is None or change is None:
            if not _tpex_warned["quotes"] and row:
                logger.warning("TPEX quotes: unresolved keys, sample row keys=%s", list(row.keys()))
                _tpex_warned["quotes"] = True
            continue
        code = str(code).strip()
        name = str(_first(row, _TPEX_NAME) or "").strip()
        shares = _to_int(_first(row, _TPEX_VOL))
        s = _assemble(code, name, "tpex", close, change, shares, inst.get(code, {}))
        if s:
            stocks.append(s)
    return stocks


def _categorize_tpex_inst_key(key: str) -> tuple[str | None, str | None]:
    """把單一 TPEX 三大法人 column key 分類成 (category, side)。

    TPEX 實際格式(2024+):
      'Foreign Investors include Mainland Area Investors (Foreign Dealers excluded)-Total Buy'
      'Foreign Investors include Mainland Area Investors (Foreign Dealers excluded)-Total Sell'
      'Foreign Dealers-Total Buy' / '-Total Sell'
      'Securities Investment Trust Companies-Total Buy' / '-Total Sell'
      'Dealers(Self)-Total Buy' / 'Dealers(Hedge)-Total Buy' …

    分類順序(先進階先決,因為 'Foreign Dealers' 也含 dealer 字):
      1. investment trust / 投信  → trust
      2. foreign / 外資 / 陸資     → foreign(含 Foreign Dealers,符合台灣慣例)
      3. dealer / 自營             → dealer
    """
    ks = str(key)
    kl = ks.lower()

    if "total buy" in kl or "買進" in ks:
        side = "buy"
    elif "total sell" in kl or "賣出" in ks:
        side = "sell"
    else:
        return None, None

    if "investment trust" in kl or "投信" in ks:
        return "trust", side
    if "foreign" in kl or "外資" in ks or "陸資" in ks:
        return "foreign", side
    if "dealer" in kl or "自營" in ks:
        return "dealer", side
    return None, None


def _parse_tpex_inst(rows: list[dict]) -> dict[str, dict]:
    """上櫃三大法人 → {code: {foreign, trust, dealer}}(張)。

    兩層解析:
      1. 先試已知的 Net key(舊版 / 中文欄)直接拿淨值
      2. 找不到時掃 (key, value),用 _categorize_tpex_inst_key 分類後
         加總 buy 與 sell,net = buy - sell

    foreign 涵蓋 'Foreign Investors include Mainland' + 'Foreign Dealers'
    (台灣慣例:外資總額 = 排除外資自營商的外陸資 + 外資自營商)。
    """
    _UNIT = 1000
    out: dict[str, dict] = {}
    for row in rows:
        code = _first(row, _TPEX_CODE)
        if code is None:
            continue
        code = str(code).strip()

        # 1. 直接拿 Net column(如果有)
        foreign = _first(row, ["ForeignInvestorsNetBuySell", "外資及陸資買賣超股數", "外資買賣超股數"])
        trust = _first(row, ["SecuritiesInvestmentTrustNetBuySell", "投信買賣超股數"])
        dealer = _first(row, ["DealersNetBuySell", "自營商買賣超股數"])

        if foreign is None and trust is None and dealer is None:
            # 2. Total Buy / Total Sell 分欄格式 — 各自加總後相減
            buckets = {
                "foreign": {"buy": 0, "sell": 0},
                "trust": {"buy": 0, "sell": 0},
                "dealer": {"buy": 0, "sell": 0},
            }
            for k, v in row.items():
                cat, side = _categorize_tpex_inst_key(k)
                if cat is None or side is None:
                    continue
                buckets[cat][side] += _to_int(v)
            foreign = buckets["foreign"]["buy"] - buckets["foreign"]["sell"]
            trust = buckets["trust"]["buy"] - buckets["trust"]["sell"]
            dealer = buckets["dealer"]["buy"] - buckets["dealer"]["sell"]

            if not _tpex_warned["inst"] and (foreign or trust or dealer) == 0 and row:
                logger.warning(
                    "TPEX 3insti: parsed empty for %s, sample keys=%s",
                    code, list(row.keys()),
                )
                _tpex_warned["inst"] = True

        out[code] = {
            "foreign": _to_int(foreign) // _UNIT,
            "trust": _to_int(trust) // _UNIT,
            "dealer": _to_int(dealer) // _UNIT,
        }
    return out


def _assemble(code, name, market, close, change, shares, flow) -> DailyStock | None:
    prev_close = close - change
    if prev_close <= 0:
        return None
    pct = change / prev_close * 100.0
    limit_price = _limit_up_price(prev_close)
    # 漲停判定:close 達 tick-adjusted 漲停價,或漲幅 ≥ 9.5%(兜底使用者要求)
    is_limit_up = close >= limit_price - 1e-6 or pct >= LIMIT_UP_PCT_FLOOR
    if not is_limit_up or pct <= 0:
        return None
    base, sub = stock_sector.classify(code, name)
    return DailyStock(
        code=code,
        name=name,
        market=market,
        close=close,
        changePercent=round(pct, 2),
        volume=shares // 1000,
        concept=sub,
        concept_reason=base,
        foreign=flow.get("foreign", 0),
        trust=flow.get("trust", 0),
        dealer=flow.get("dealer", 0),
        brokers=[],
    )


async def get_daily_limit_up(
    market: str = "all",
    date: str | None = None,
    *,
    _from_snapshot_job: bool = False,
) -> DailyLimitUpResponse:
    """取得當日 / 歷史漲停清單。

    - date=None 或 date=today(Asia/Taipei) → 即時抓 TWSE/TPEX OpenAPI
    - date 為過往日期 → 從 daily_limit_up_snapshots 讀;查無回 404 由 router 處理

    _from_snapshot_job=True 是給 daily_snapshot_service.save_today_snapshot
    用的內部 flag,避免「snapshot job 抓 live 結果」變成自己呼叫自己的循環。
    """
    now = datetime.now(TPE)
    today_str = now.strftime("%Y-%m-%d")
    requested_date = date or today_str

    # 歷史查詢走 DB
    if requested_date != today_str and not _from_snapshot_job:
        from app.db import AsyncSessionLocal
        from app.services import daily_snapshot_service

        target = daily_snapshot_service._parse_iso_date(requested_date)
        if target is None:
            raise ValueError(f"invalid date format: {requested_date}")
        async with AsyncSessionLocal() as db:
            snap = await daily_snapshot_service.get_by_date(db, target)
        if snap is None:
            raise LookupError(f"no snapshot for {requested_date}")
        return snap

    want_twse = market in ("all", "twse")
    want_tpex = market in ("all", "tpex")

    # 用 TWSE/TPEX OpenAPI 自己回的 Date 當實際資料日期,而非 datetime.now()。
    # 原因:盤前 / 非交易日呼叫時,OpenAPI 仍會回「最近一個交易日」的資料。
    # 若仍用 today 當 date,會把昨天/上週的漲停清單冠上「今天」誤導使用者
    # (例如週二早上看,川湖被列入「2026-06-23 漲停」,實際是 06-22 的)。
    source_date_str: str | None = None

    stocks: list[DailyStock] = []
    async with httpx.AsyncClient(headers={"User-Agent": "twstock-dashboard/1.0"}) as client:
        if want_twse:
            all_rows = await _fetch_json(client, STOCK_DAY_ALL)
            # TWSE Date 是民國年 YYYMMDD;115/06/22 = 2026-06-22
            if all_rows:
                source_date_str = _parse_twse_roc_date(all_rows[0].get("Date", ""))
            # T86 OpenAPI (openapi.twse.com.tw/v1/fund/T86) 已 302→404 失效。
            # 改走 legacy endpoint,帶 TWSE 回的真實資料日期當 date param。
            t86_date = source_date_str or now.strftime("%Y-%m-%d")
            t86_rows = await _fetch_t86_for_date(client, t86_date)
            stocks += _build_twse_stocks(all_rows, _parse_t86(t86_rows))
        if want_tpex:
            q_rows = await _fetch_json(client, TPEX_QUOTES)
            i_rows = await _fetch_json(client, TPEX_3INSTI)
            stocks += _build_tpex_stocks(q_rows, _parse_tpex_inst(i_rows))
            # 沒拿到 TWSE date 才從 TPEX 抓(TPEX Date 是 YYYY-MM-DD)
            if source_date_str is None and q_rows:
                source_date_str = str(q_rows[0].get("Date", "")) or None

    # 還沒拿到資料來源日期 → fallback 今天
    date_str = source_date_str or today_str

    # ── Yahoo fallback ─────────────────────────────────────────
    # 如果 TWSE/TPEX OpenAPI 的 Date 還沒推進到今日(常見:18:00 前 TWSE 還在
    # push 當日盤後資料),用 Yahoo 雅虎股市漲幅榜補一份 today's 漲停清單。
    # 法人欄能拿到就用 TWSE T86 (今日 date,可能 OpenAPI 已推進法人但沒推進
    # STOCK_DAY_ALL),拿不到留 0;族群用 stock_sector classify。
    if date_str != today_str:
        try:
            from app.services.yahoo_rank import fetch_yahoo_limit_up_all
            yahoo_rows = await fetch_yahoo_limit_up_all(min_pct=9.5)
            if yahoo_rows:
                # 法人:重抓今日 T86(可能 OpenAPI 已 push 法人但 STOCK_DAY_ALL 仍 stale)
                inst_map: dict[str, dict] = {}
                try:
                    async with httpx.AsyncClient(headers={"User-Agent": "twstock-dashboard/1.0"}) as c:
                        today_t86 = await _fetch_t86_for_date(c, today_str)
                    if today_t86:
                        inst_map = _parse_t86(today_t86)
                except Exception:  # noqa: BLE001
                    logger.exception("yahoo fallback: today T86 fetch failed")

                # 重組 stocks:用 Yahoo 為主、enrich 法人/族群
                stocks = []
                for r in yahoo_rows:
                    code = r["code"]
                    name = r["name"]
                    mk = r["market"]
                    # 兼容 want_twse/want_tpex 過濾
                    if mk == "twse" and not want_twse:
                        continue
                    if mk == "tpex" and not want_tpex:
                        continue
                    flow = inst_map.get(code, {})
                    base, sub = stock_sector.classify(code, name)
                    stocks.append(DailyStock(
                        code=code,
                        name=name,
                        market=mk,
                        close=r["close"],
                        changePercent=round(r["change_pct"], 2),
                        volume=0,  # Yahoo 漲幅榜未含;後續 TWSE OpenAPI 推進後 chase-today 會補
                        concept=sub,
                        concept_reason=base,
                        foreign=int(flow.get("foreign", 0)),
                        trust=int(flow.get("trust", 0)),
                        dealer=int(flow.get("dealer", 0)),
                        brokers=[],
                    ))
                date_str = today_str
                logger.info("yahoo fallback used (TWSE Date=%s, today=%s, yahoo_n=%d)",
                            source_date_str, today_str, len(stocks))
        except Exception:  # noqa: BLE001
            logger.exception("yahoo fallback failed, sticking with TWSE OpenAPI data")

    base_counter = Counter(s.concept_reason for s in stocks if s.concept_reason)
    sub_counter = Counter(s.concept for s in stocks if s.concept)
    breakdown = MarketBreakdown(
        twse=sum(1 for s in stocks if s.market == "twse"),
        tpex=sum(1 for s in stocks if s.market == "tpex"),
    )

    return DailyLimitUpResponse(
        date=date_str,
        updatedAt=now.isoformat(),
        total=len(stocks),
        breakdown=breakdown,
        baseSectors=[SectorOption(name=k, count=v) for k, v in base_counter.most_common()],
        subSectors=[SectorOption(name=k, count=v) for k, v in sub_counter.most_common()],
        stocks=sorted(stocks, key=lambda s: (s.market, s.code)),
    )
