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
T86 = "https://openapi.twse.com.tw/v1/fund/T86"
# 上櫃 TPEX
TPEX_QUOTES = "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes"
TPEX_3INSTI = "https://www.tpex.org.tw/openapi/v1/tpex_3insti_daily_trading"

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


async def _fetch_json(client: httpx.AsyncClient, url: str) -> list[dict]:
    try:
        r = await client.get(url, timeout=25)
        r.raise_for_status()
        data = r.json()
        return data if isinstance(data, list) else []
    except Exception as e:  # noqa: BLE001
        logger.warning("fetch failed %s: %s", url, e)
        return []


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

    date_str = today_str
    want_twse = market in ("all", "twse")
    want_tpex = market in ("all", "tpex")

    stocks: list[DailyStock] = []
    async with httpx.AsyncClient(headers={"User-Agent": "twstock-dashboard/1.0"}) as client:
        if want_twse:
            all_rows = await _fetch_json(client, STOCK_DAY_ALL)
            t86_rows = await _fetch_json(client, T86)
            stocks += _build_twse_stocks(all_rows, _parse_t86(t86_rows))
        if want_tpex:
            q_rows = await _fetch_json(client, TPEX_QUOTES)
            i_rows = await _fetch_json(client, TPEX_3INSTI)
            stocks += _build_tpex_stocks(q_rows, _parse_tpex_inst(i_rows))

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
