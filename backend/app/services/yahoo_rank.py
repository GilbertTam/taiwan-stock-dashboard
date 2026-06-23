"""Yahoo 雅虎股市漲幅榜 scraper — 作 TWSE OpenAPI 延遲的 fallback。

背景:
  TWSE OpenAPI STOCK_DAY_ALL 收盤後 17-20 點才會推到當日資料,期間 user 看「今日
  漲停」會顯示「最近交易日」(昨天)的清單。Yahoo 雅虎股市的漲幅榜頁是 server-
  rendered HTML 且即時更新(盤中也能用),可作為「TWSE 還沒推進到今日」時的 fallback。

抓取目標:
  上市:https://tw.stock.yahoo.com/rank/change-up?exchange=TAI&period=1d
  上櫃:https://tw.stock.yahoo.com/rank/change-up?exchange=TWO&period=1d

回傳 list[dict] 每項:{code, name, market, close, change, change_pct}
不含 volume / 法人 / 族群 — 由上層用 TWSE T86 + stock_sector 補。

注意:Yahoo HTML 用 Tailwind-like atomic CSS (`Fw(600)` `Fz(16px)` 等)
class,我們 regex 偵測 `/quote/{code}.TW` 的 anchor + 之後的 close/change/pct
fields。Yahoo 改設計後 regex 會壞 — 失敗時 catch 並回 [],上層 fall back to TWSE。
"""
from __future__ import annotations

import logging
import re
from typing import Literal

import httpx

logger = logging.getLogger(__name__)

YAHOO_RANK_URL = "https://tw.stock.yahoo.com/rank/change-up"
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html",
    "Accept-Language": "zh-TW,zh;q=0.9",
}

# 解一筆 row 的 regex (寬鬆對 Yahoo HTML 結構):
#   <a href="/quote/{code}.TW" ...>...
#   <div class="...Fw(600)...">{name}</div>
#   ...
#   <span>...{close}</span>
#   ...
#   <span>...{change}</span>
#   ...
#   <span>...{change_pct}%</span>
_ROW_PATTERN = re.compile(
    r'/quote/(\d+)\.TW(?:O)?"[^>]*>'                # code (TWSE 用 .TW; TPEX 也用 .TWO 或 .TW)
    r'.*?Fw\(600\)[^>]*>([^<]+)</div>'             # name
    r'.*?(\d+\.\d{2})</span>'                       # close
    r'.*?(-?\d+\.\d{2})</span>'                     # change
    r'.*?(-?\d+\.\d{2})%</span>',                   # change pct
    re.DOTALL,
)


async def fetch_yahoo_rank(
    market: Literal["TAI", "TWO"],
    *,
    min_pct: float = 9.5,
) -> list[dict]:
    """從 Yahoo 漲幅榜抓 market 中 change_pct >= min_pct 的所有股票。

    market: 'TAI' = 上市 / 'TWO' = 上櫃
    回 [{code, name, market, close, change, change_pct}, ...]
    """
    market_db = "twse" if market == "TAI" else "tpex"
    url = f"{YAHOO_RANK_URL}?exchange={market}&period=1d"

    try:
        async with httpx.AsyncClient(headers=_HEADERS, follow_redirects=True, timeout=15) as c:
            r = await c.get(url)
            r.raise_for_status()
            html = r.text
    except Exception as e:  # noqa: BLE001
        logger.warning("yahoo rank %s fetch failed: %s", market, e)
        return []

    matches = _ROW_PATTERN.findall(html)
    if not matches:
        logger.warning("yahoo rank %s: parsed 0 rows (HTML structure changed?)", market)
        return []

    out: list[dict] = []
    for code, name, close_s, change_s, pct_s in matches:
        try:
            close = float(close_s)
            change = float(change_s)
            pct = float(pct_s)
        except ValueError:
            continue
        if pct < min_pct:
            # 漲幅榜由高到低,撞到第一個低於門檻就停
            break
        out.append({
            "code": code,
            "name": name.strip(),
            "market": market_db,
            "close": close,
            "change": change,
            "change_pct": pct,
        })

    logger.info("yahoo rank %s: %d stocks >= %.1f%%", market, len(out), min_pct)
    return out


async def fetch_yahoo_limit_up_all(min_pct: float = 9.5) -> list[dict]:
    """同時抓上市 + 上櫃。"""
    import asyncio
    twse, tpex = await asyncio.gather(
        fetch_yahoo_rank("TAI", min_pct=min_pct),
        fetch_yahoo_rank("TWO", min_pct=min_pct),
    )
    return twse + tpex
