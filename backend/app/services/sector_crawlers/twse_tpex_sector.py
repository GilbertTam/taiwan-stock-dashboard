"""
TWSE / TPEX 產業別 → 股票代號 對照表爬蟲
- 上市 (kind=1)：isin.twse.com.tw
- 上櫃 (kind=2)：同一系統，kind 參數切換
來源：https://isin.twse.com.tw/isin/class_i.jsp
"""

import requests
import pandas as pd
from bs4 import BeautifulSoup
import time

# ── 完整產業代碼對照（TWSE 官方，上市/上櫃共用） ───────────────
TWSE_INDUSTRY_CODES = {
    "01": "水泥工業",        "02": "食品工業",        "03": "塑膠工業",
    "04": "紡織纖維",        "05": "電機機械",        "06": "電器電纜",
    "08": "玻璃陶瓷",        "09": "造紙工業",        "10": "鋼鐵工業",
    "11": "橡膠工業",        "12": "汽車工業",        "13": "電子工業",
    "14": "建材營造業",      "15": "航運業",          "16": "觀光餐旅",
    "17": "金融保險業",      "18": "貿易百貨業",      "19": "綜合",
    "20": "其他業",          "21": "化學工業",        "22": "生技醫療業",
    "23": "油電燃氣業",      "24": "半導體業",        "25": "電腦及週邊設備業",
    "26": "光電業",          "27": "通信網路業",      "28": "電子零組件業",
    "29": "電子通路業",      "30": "資訊服務業",      "31": "其他電子業",
    "32": "文化創意業",      "33": "農業科技業",      "35": "綠能環保",
    "36": "數位雲端",        "37": "運動休閒",        "38": "居家生活",
}

# ── 產業代碼 → 族群（純文字，無 emoji） ─────────────────────────
INDUSTRY_CODE_TO_SECTOR = {
    "01": "建材水泥",    "02": "食品農業",    "03": "塑化化工",
    "04": "紡織",        "05": "電機機械",    "06": "電力設備",
    "08": "建材水泥",    "09": "造紙",        "10": "鋼鐵金屬",
    "11": "鋼鐵金屬",   "12": "汽車",        "13": "電子工業",
    "14": "營建資產",    "15": "航運",        "16": "觀光",
    "17": "金融",        "18": "電子通路",    "19": "綜合",
    "20": "",            "21": "塑化化工",    "22": "生技醫療",
    "23": "電力設備",   "24": "半導體",      "25": "電腦週邊",
    "26": "面板光電",   "27": "網通",        "28": "電子零組件",
    "29": "電子通路",   "30": "軟體資訊",    "31": "其他電子",
    "32": "文創娛樂",   "33": "食品農業",    "35": "環保綠能",
    "36": "數位雲端",   "37": "運動休閒",    "38": "居家生活",
}

MARKET_LABEL = {"1": "上市", "2": "上櫃"}


# ── 爬蟲主函式 ──────────────────────────────────────────────────
def fetch_industry_stocks(industry_code: str, kind: str = "1") -> list[dict]:
    url = "https://isin.twse.com.tw/isin/class_main.jsp"
    params = {
        "kind": kind,
        "owncode": "",
        "stockname": "",
        "isincode": "",
        "markettype": "",
        "issuetype": "1",
        "industry_code": industry_code,
        "Page": "1",
        "chklike": "Y",
    }
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://isin.twse.com.tw/isin/class_i.jsp",
    }

    try:
        resp = requests.get(url, params=params, headers=headers, timeout=15)
        resp.encoding = "big5"
        soup = BeautifulSoup(resp.text, "html.parser")

        rows = []
        table = soup.find("table", {"class": "h4"})
        if not table:
            return rows

        for tr in table.find_all("tr")[1:]:
            tds = tr.find_all("td")
            if len(tds) >= 4:
                code = tds[2].get_text(strip=True)
                name = tds[3].get_text(strip=True)
                isin = tds[1].get_text(strip=True)
                if code.isdigit() and 4 <= len(code) <= 6:
                    sector = INDUSTRY_CODE_TO_SECTOR.get(industry_code, "")
                    rows.append({
                        "股票代號": code,
                        "股票名稱": name,
                        "ISIN":     isin,
                        "市場":     MARKET_LABEL.get(kind, kind),
                        "產業代碼": industry_code,
                        "產業名稱": TWSE_INDUSTRY_CODES.get(industry_code, ""),
                        "族群":     sector,
                    })
        return rows

    except Exception as e:
        print(f"  ⚠️  產業 {industry_code} (kind={kind}) 抓取失敗：{e}")
        return []


def build_full_table(kinds: list[str] = ["1", "2"]) -> pd.DataFrame:
    all_rows = []

    for kind in kinds:
        label = MARKET_LABEL.get(kind, kind)
        print(f"\n{'='*50}")
        print(f"📥 開始抓取【{label}】股票產業對照表 (kind={kind})")
        print(f"{'='*50}")
        total = len(TWSE_INDUSTRY_CODES)

        for i, code in enumerate(TWSE_INDUSTRY_CODES.keys(), 1):
            name = TWSE_INDUSTRY_CODES[code]
            print(f"  [{i:02d}/{total}] 產業 {code} - {name} ...", end=" ")
            rows = fetch_industry_stocks(code, kind=kind)
            count = len(rows)
            print(f"✅ {count} 筆" if count else "— 無資料")
            all_rows.extend(rows)
            time.sleep(0.4)

    df = pd.DataFrame(all_rows)
    return df


# ── lookup：{股票代號: {"族群": ..., "市場": ...}} ───────────────
def make_lookup(df: pd.DataFrame) -> dict:
    lookup = {}
    for _, row in df.iterrows():
        lookup[row["股票代號"]] = {
            "族群": row["族群"],
            "市場": row["市場"],
        }
    return lookup


def _keyword_fallback(stock_name: str) -> str:
    """關鍵字比對，找不到回傳空字串（不亂命名）"""
    SECTOR_KEYWORDS = [
        (("紡", "纖", "織", "布", "成衣"),          "紡織"),
        (("生技", "醫療", "藥", "基因", "疫"),       "生技醫療"),
        (("鋼", "鐵", "不鏽", "金屬", "鋁", "銅"),  "鋼鐵金屬"),
        (("塑膠", "化工", "化學", "油墨", "樹脂"),   "塑化化工"),
        (("航運", "海運", "貨櫃", "散裝", "船"),     "航運"),
        (("半導體", "晶圓", "封測"),                  "半導體"),
        (("伺服器", "機櫃", "導軌"),                  "電腦週邊"),
        (("電池", "儲能", "充電"),                    "電源儲能"),
        (("軟體", "資訊", "雲端", "數位"),            "軟體資訊"),
    ]
    for keywords, sector in SECTOR_KEYWORDS:
        if any(kw in stock_name for kw in keywords):
            return sector
    return ""


def get_sector(stock_code: str, stock_name: str, lookup: dict) -> tuple[str, str]:
    """回傳 (族群, 市場)。官方表 → 關鍵字降級 → 空字串。"""
    if stock_code in lookup:
        info = lookup[stock_code]
        sector = info["族群"]
        market = info["市場"]
        if not sector:
            sector = _keyword_fallback(stock_name)
        return sector, market
    return _keyword_fallback(stock_name), ""
