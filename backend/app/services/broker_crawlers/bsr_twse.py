"""TWSE BSR 分點券商抓取器（基於使用者提供的 bsr_analysis.py）。

對外只有一個函式：
    analyze_broker_full(stock_id: str, *, max_retry=20) -> dict | None

回傳結構：
    {
      "stock_id":   "2472",
      "stock_name": "立隆電",
      "trade_date": datetime.date | None,        # ← 轉成 date 物件
      "price":      { open, high, low, close },
      "summary":    { total_records, total_brokers },
      "all":        [ {broker_code, broker_name, net, buy, sell, buy_avg, sell_avg}, ... ]
                    # ↑ 不再切 top_n，回傳全部分點。Top 15 / 排名由 broker_service 處理。
    }

依賴：requests, ddddocr, Pillow, bs4, pandas。
注意：抓取單檔耗時 10–60 秒（驗證碼重試），請務必背景執行。
"""
from __future__ import annotations

import os
import re
import time
import logging
from datetime import datetime, date
from io import BytesIO
from typing import Optional

import requests
import pandas as pd
from bs4 import BeautifulSoup
from PIL import Image, ImageFilter, ImageOps

logger = logging.getLogger(__name__)

_BASE_URL = "https://bsr.twse.com.tw/bshtm"
_MENU_URL = f"{_BASE_URL}/bsMenu.aspx"
_DETAIL_HDR = ['序', '證券商', '成交單價', '買進股數', '賣出股數']
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Referer": _MENU_URL,
}


# ── 工具 ─────────────────────────────────────────────────────
def _preprocess_captcha(img_bytes: bytes) -> bytes:
    img = Image.open(BytesIO(img_bytes)).convert("L")
    img = img.resize((img.width * 3, img.height * 3), Image.LANCZOS)
    img = img.filter(ImageFilter.SHARPEN).filter(ImageFilter.SHARPEN)
    img = img.point(lambda p: 255 if p > 140 else 0)
    img = ImageOps.invert(img)
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _clean_name(raw: str) -> str:
    return re.sub(r'[\s\u3000]+', '', raw)


def _to_int(s: str) -> int:
    s = s.replace(',', '').strip()
    return int(s) if s.isdigit() else 0


def _wavg(sub: pd.DataFrame, col: str) -> float:
    w = sub[col]
    total = w.sum()
    return round((sub['price'] * w).sum() / total, 2) if total > 0 else 0.0


def _safe_float(v) -> Optional[float]:
    try:
        return float(str(v).replace(',', '').strip())
    except (ValueError, TypeError):
        return None


def _parse_trade_date(raw: str) -> Optional[date]:
    """把 BSR 回傳的 '2026/06/22' / '115/06/22' 字串轉 datetime.date。"""
    if not raw:
        return None
    s = raw.strip()
    # 民國年 → 西元年
    m = re.match(r"^(\d{2,3})/(\d{1,2})/(\d{1,2})$", s)
    if m:
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if y < 200:
            y += 1911
        try:
            return date(y, mo, d)
        except ValueError:
            return None
    try:
        return datetime.strptime(s.split()[0], "%Y/%m/%d").date()
    except ValueError:
        return None


# BSR site 回的「該股無資料」訊息關鍵字 — 撞到就立刻停止重試
_NO_DATA_HINTS = ("查無資料", "查 無 資 料", "無資料", "查詢無資料")


class BsrFailureReason:
    """analyze_broker_full 失敗時的精準原因 — 寫進 snapshot.error。"""
    NO_DATA = "no_data"                 # BSR 站明確回查無資料
    CAPTCHA_EXHAUSTED = "captcha_exhausted"  # max_retry 用完仍解不出
    NETWORK_ERROR = "network_error"     # 連 BSR 站失敗
    PARSE_EMPTY = "parse_empty"         # 拿到 HTML 但解析出空 DataFrame
    UNKNOWN = "unknown"


# ── 主類別 ───────────────────────────────────────────────────
class BsrAnalyzer:
    """整支等同你原本的 bsr_analysis.BsrAnalyzer,移除 top_n 切分。"""

    def __init__(
        self,
        stock_id: str,
        max_retry: int = 20,
        save_captcha: bool = False,
        captcha_dir: str = "./captcha_images",
    ):
        # 延遲匯入 ddddocr(很重,import 時就會載 TF Lite)
        import ddddocr  # noqa: WPS433

        self.stock_id = stock_id
        self.max_retry = max_retry
        self.save_captcha = save_captcha
        self.captcha_dir = captcha_dir
        self._ocr = ddddocr.DdddOcr(show_ad=False)

        self._market_info: dict = {}
        self._df: Optional[pd.DataFrame] = None
        self._summary: Optional[pd.DataFrame] = None
        # 給上層 analyze_broker_full 用,告知失敗的精準原因
        self.failure_reason: Optional[str] = None

    # ── Step 1: HTML 抓取 ──
    def _fetch_html(self) -> Optional[str]:
        """成功:回 HTML 字串。失敗:回 None 且設 self.failure_reason。

        重要:當 BSR 站明確回「查無資料」(該股當日真的沒分點)時,
        立刻 break + failure_reason=NO_DATA,不再耗 max_retry 次去試。
        """
        if self.save_captcha:
            os.makedirs(self.captcha_dir, exist_ok=True)

        last_network_err = False
        for attempt in range(1, self.max_retry + 1):
            logger.info("BSR %s: attempt %d/%d", self.stock_id, attempt, self.max_retry)
            session = requests.Session()

            try:
                resp = session.get(_MENU_URL, headers=_HEADERS, timeout=15)
                resp.encoding = "utf-8"
            except requests.RequestException as e:
                logger.warning("GET failed: %s", e)
                last_network_err = True
                time.sleep(2)
                continue

            soup = BeautifulSoup(resp.text, "html.parser")

            def _val(id_):
                tag = soup.find("input", {"id": id_})
                return tag["value"] if tag else ""

            viewstate = _val("__VIEWSTATE")
            viewstate_gen = _val("__VIEWSTATEGENERATOR")
            event_valid = _val("__EVENTVALIDATION")

            captcha_tag = soup.find("img", src=re.compile(r"CaptchaImage\.aspx"))
            if not captcha_tag:
                logger.warning("captcha image not found")
                continue

            try:
                img_bytes = session.get(
                    f"{_BASE_URL}/{captcha_tag['src']}",
                    headers=_HEADERS, timeout=10,
                ).content
            except requests.RequestException as e:
                logger.warning("captcha fetch failed: %s", e)
                last_network_err = True
                continue

            raw_text = (self._ocr.classification(img_bytes)
                                  .strip().upper().replace(" ", ""))
            proc_text = (self._ocr.classification(_preprocess_captcha(img_bytes))
                                  .strip().upper().replace(" ", ""))
            captcha_text = proc_text if len(proc_text) == 5 else raw_text

            if len(captcha_text) != 5:
                time.sleep(1)
                continue

            payload = {
                "__EVENTTARGET": "", "__EVENTARGUMENT": "", "__LASTFOCUS": "",
                "__VIEWSTATE": viewstate,
                "__VIEWSTATEGENERATOR": viewstate_gen,
                "__EVENTVALIDATION": event_valid,
                "RadioButton_Normal": "RadioButton_Normal",
                "TextBox_Stkno": self.stock_id,
                "CaptchaControl1": captcha_text,
                "btnOK": "查詢",
            }

            try:
                post_resp = session.post(_MENU_URL, data=payload, headers=_HEADERS, timeout=20)
                post_resp.encoding = "utf-8"
            except requests.RequestException as e:
                logger.warning("POST failed: %s", e)
                last_network_err = True
                time.sleep(2)
                continue

            err_soup = BeautifulSoup(post_resp.text, "html.parser")
            err_label = err_soup.find("span", {"id": "Label_ErrorMsg"})
            if err_label and err_label.text.strip():
                err_text = err_label.text.strip()
                # 「查無資料」≠ 驗證碼錯;這是 BSR 站告訴你該股當日真的沒分點。
                # 立刻 break 不再重試 — 重試也只會拿到同樣訊息。
                if any(h in err_text for h in _NO_DATA_HINTS):
                    logger.info("BSR %s: no data (%s) — stop retrying", self.stock_id, err_text)
                    self.failure_reason = BsrFailureReason.NO_DATA
                    return None
                logger.warning("BSR returned error: %s", err_text)
                continue

            # 跟 JS redirect: top.page2.location.href='bsContent.aspx?...'
            m = re.search(r"top\.page2\.location\.href\s*=\s*['\"]([^'\"]+)['\"]", post_resp.text)
            if not m:
                continue

            content_url = f"{_BASE_URL}/{m.group(1)}"
            try:
                content_resp = session.get(content_url, headers=_HEADERS, timeout=20)
                content_resp.encoding = "utf-8"
            except requests.RequestException as e:
                logger.warning("content fetch failed: %s", e)
                last_network_err = True
                continue

            return content_resp.text

        # max_retry 用完
        self.failure_reason = (
            BsrFailureReason.NETWORK_ERROR if last_network_err
            else BsrFailureReason.CAPTCHA_EXHAUSTED
        )
        return None

    # ── Step 2: HTML 解析（兩段式） ──
    def _parse_html(self, html_text: str):
        soup = BeautifulSoup(html_text, "html.parser")

        # 市場資訊（含交易日期、OHLC）
        info_tbl = soup.find("table", id="Table1") or soup.find("table", id="table1")
        if info_tbl:
            for tr in info_tbl.find_all("tr"):
                tds = tr.find_all("td")
                for i in range(0, len(tds) - 1, 2):
                    k = tds[i].get_text(strip=True).rstrip(":：")
                    v = tds[i + 1].get_text(strip=True)
                    if k:
                        self._market_info[k] = v

        # Pass 1: 建立 code → name 全域對照
        code_name_map: dict[str, dict] = {}
        for tbl in soup.find_all("table"):
            for tr in tbl.find_all("tr"):
                tds = tr.find_all("td")
                if len(tds) < 5:
                    continue
                for i, td in enumerate(tds):
                    raw = td.get_text(strip=True)
                    m = re.match(r'^([A-Z0-9a-z]{4})\s+(.+)$', raw)
                    if m:
                        code = m.group(1).upper()
                        name = _clean_name(m.group(2))
                        parity = 'odd' if i % 2 == 0 else 'even'
                        other = 'even' if parity == 'odd' else 'odd'
                        if code not in code_name_map:
                            code_name_map[code] = {'odd': None, 'even': None}
                        code_name_map[code][parity] = name
                        if code_name_map[code][other] is None:
                            code_name_map[code][other] = name

        # Pass 2: 解明細
        records = []
        for tbl in soup.find_all("table"):
            tds = tbl.find_all("td")
            current_name: dict[str, dict] = {}
            for i in range(0, len(tds) - 4, 5):
                row_tds = tds[i:i + 5]
                seq_str = row_tds[0].get_text(strip=True)
                broker_raw = row_tds[1].get_text(" ", strip=True)
                price_str = row_tds[2].get_text(strip=True)
                buy_str = row_tds[3].get_text(strip=True)
                sell_str = row_tds[4].get_text(strip=True)

                if not seq_str.isdigit():
                    continue
                seq = int(seq_str)
                parity = 'odd' if (seq % 2) == 1 else 'even'
                other = 'even' if parity == 'odd' else 'odd'

                broker_clean = broker_raw.replace('\u3000', ' ').strip()
                m_full = re.match(r'^([A-Z0-9a-z]{4})\s+(.+)$', broker_clean)
                m_plain = re.match(r'^([A-Z0-9a-z]{4})$', broker_clean)

                if m_full:
                    code = m_full.group(1).upper()
                    name = _clean_name(m_full.group(2))
                    if code not in current_name:
                        current_name[code] = {'odd': None, 'even': None}
                    current_name[code][parity] = name
                    if current_name[code][other] is None:
                        current_name[code][other] = name
                elif m_plain:
                    code = m_plain.group(1).upper()
                    name = None
                    if code in current_name:
                        name = current_name[code][parity] or current_name[code][other]
                    if name is None and code in code_name_map:
                        name = code_name_map[code][parity] or code_name_map[code][other]
                    if name is None:
                        name = code
                else:
                    continue

                try:
                    price = float(price_str)
                    buy = _to_int(buy_str)
                    sell = _to_int(sell_str)
                except ValueError:
                    continue

                records.append({
                    'seq': seq,
                    'broker_code': code,
                    'broker_name': name,
                    'price': price,
                    'buy_shares': buy,
                    'sell_shares': sell,
                })

        self._df = (
            pd.DataFrame(records)
              .drop_duplicates(subset=['seq'])
              .sort_values('seq')
              .reset_index(drop=True)
        )

    # ── Step 3: 彙整(全部分點,不切 top_n) ──
    def _calc_summary(self):
        df = self._df

        # 重要: 只依 broker_code 分組,name 取第一個非空。
        # 原本用 (code, name) 分組,但 BSR HTML 解析時 parity 快取可能讓
        # 同一個 broker_code 在不同列拿到帶/不帶空白的 name,造成 groupby
        # 拆成兩列同 code,後續寫入 DB 撞 UNIQUE(snapshot_id, broker_code)。
        name_map = (df.groupby('broker_code')['broker_name']
                      .agg(lambda s: next((x for x in s if x), s.iloc[0]))
                      .to_dict())

        grp = (df.groupby('broker_code', as_index=False)
                 .agg(buy_shares=('buy_shares', 'sum'),
                      sell_shares=('sell_shares', 'sum')))
        grp['broker_name'] = grp['broker_code'].map(name_map).fillna(grp['broker_code'])
        grp['net'] = (grp['buy_shares'] - grp['sell_shares']) / 1000
        grp['buy'] = grp['buy_shares'] / 1000
        grp['sell'] = grp['sell_shares'] / 1000

        buy_avg = (df.groupby('broker_code')
                     .apply(lambda s: _wavg(s, 'buy_shares'))
                     .rename('buy_avg').reset_index())
        sell_avg = (df.groupby('broker_code')
                      .apply(lambda s: _wavg(s, 'sell_shares'))
                      .rename('sell_avg').reset_index())

        grp = (grp.merge(buy_avg, on='broker_code', how='left')
                  .merge(sell_avg, on='broker_code', how='left'))

        # 保留全部分點,按 net 降冪
        self._summary = (grp[['broker_code', 'broker_name', 'net', 'buy', 'sell', 'buy_avg', 'sell_avg']]
                         .round(2)
                         .sort_values('net', ascending=False)
                         .reset_index(drop=True))

    # ── Step 4: 組裝 ──
    def _build_result(self) -> dict:
        m = self._market_info
        raw_id = m.get("股票代號", self.stock_id)
        parts = raw_id.strip().split(None, 1)
        stock_id = parts[0] if parts else raw_id
        stock_name = parts[1] if len(parts) > 1 else m.get("股票名稱", "")

        return {
            "stock_id": stock_id,
            "stock_name": stock_name,
            "trade_date": _parse_trade_date(m.get("交易日期", "")),
            "price": {
                "open": _safe_float(m.get("開盤價")),
                "high": _safe_float(m.get("最高價")),
                "low": _safe_float(m.get("最低價")),
                "close": _safe_float(m.get("收盤價")),
            },
            "summary": {
                "total_records": int(len(self._df)),
                "total_brokers": int(self._df["broker_code"].nunique()),
            },
            "all": self._summary.to_dict(orient="records"),
        }

    def analyze(self) -> Optional[dict]:
        html_text = self._fetch_html()
        if html_text is None:
            # failure_reason 已由 _fetch_html 設定(NO_DATA / CAPTCHA_EXHAUSTED / NETWORK_ERROR)
            return None
        self._parse_html(html_text)
        if self._df is None or self._df.empty:
            logger.warning("BSR %s: parsed empty", self.stock_id)
            self.failure_reason = BsrFailureReason.PARSE_EMPTY
            return None
        self._calc_summary()
        return self._build_result()


def analyze_broker_full(stock_id: str, max_retry: int = 20) -> Optional[dict]:
    """對外入口 — 失敗時回 None,呼叫端可改用 analyze_broker_full_ex() 拿 reason。"""
    return BsrAnalyzer(stock_id=stock_id, max_retry=max_retry).analyze()


def analyze_broker_full_ex(
    stock_id: str, max_retry: int = 20,
) -> tuple[Optional[dict], Optional[str]]:
    """加強版:回 (payload, failure_reason)。

    成功:(payload, None)
    失敗:(None, BsrFailureReason.xxx)
    """
    analyzer = BsrAnalyzer(stock_id=stock_id, max_retry=max_retry)
    payload = analyzer.analyze()
    return payload, analyzer.failure_reason
