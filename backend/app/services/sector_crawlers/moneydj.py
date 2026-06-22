"""
MoneyDJ 子產業分類爬蟲 (動態解析 + 多執行緒加速)
URL pattern: https://www.moneydj.com/z/zh/zha/zh00.djhtm?a={industry_code}
編碼：Big5
"""
from __future__ import annotations

import logging
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

import pandas as pd
import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


def fetch_all_sub_sectors() -> list[tuple[str, str]]:
    """從 ZHA.djhtm 大分類目錄頁中，動態解析出所有的子產業名稱與對應代碼。"""
    url = "https://www.moneydj.com/Z/ZH/ZHA/ZHA.djhtm"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.moneydj.com/",
    }
    try:
        resp = requests.get(url, headers=headers, timeout=20)
        resp.encoding = "big5"
        html = resp.text
        
        # 尋找 zh00.djhtm?a=CXXXXXX 連結
        matches = re.findall(r'zh00.djhtm\?a=([A-Za-z0-9]+)\">([^<]+)</a>', html)
        # 去重並過濾掉空欄位
        sub_sectors = []
        seen = set()
        for code, name in matches:
            code = code.strip()
            name = name.strip()
            if code and name and code not in seen:
                seen.add(code)
                sub_sectors.append((name, code))
        return sub_sectors
    except Exception as e:
        logger.warning("Failed to fetch sub-sectors index from MoneyDJ: %s", e)
        return []


def fetch_moneydj_industry(industry_code: str, sub_name: str) -> list[dict]:
    """獲取單一子產業頁面下的有價證券代號與名稱列表。"""
    url = f"https://www.moneydj.com/z/zh/zha/zh00.djhtm?a={industry_code}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.moneydj.com/Z/ZH/ZHA/ZHA.djhtm",
        "Accept-Charset": "big5, utf-8",
    }
    try:
        resp = requests.get(url, headers=headers, timeout=15)
        resp.encoding = "big5"
        soup = BeautifulSoup(resp.text, "html.parser")

        rows = []
        table = soup.find("table", {"id": "oMainTable"}) or soup.find("table", {"class": "t01"})
        if not table:
            return rows

        for tr in table.find_all("tr"):
            tds = tr.find_all("td")
            if len(tds) < 2:
                continue
            a_tag = tds[0].find("a")
            if not a_tag:
                continue
            
            # MoneyDJ 的連結文字格式通常是 "1101台泥" (代號+名稱)
            text = a_tag.get_text(strip=True)
            text = re.sub(r'[*\s]', '', text) # 去除星號與空白
            
            # 用正則分離有價證券代碼 (4~6碼英數) 與有價證券名稱
            match = re.match(r'^([A-Za-z0-9]{4,6})(.+)$', text)
            if not match:
                continue
                
            stock_code = match.group(1)
            stock_name = match.group(2)
            
            rows.append({
                "股票代號": stock_code,
                "股票名稱": stock_name,
                "子產業":   sub_name,
                "產業代碼": industry_code,
            })
        return rows
    except Exception as e:
        logger.debug("MoneyDJ sub-sector %s (%s) fetch failed: %s", sub_name, industry_code, e)
        return []


def build_moneydj_table() -> pd.DataFrame:
    """多執行緒平行爬取 MoneyDJ 所有子產業公司列表。"""
    sub_sectors = fetch_all_sub_sectors()
    if not sub_sectors:
        logger.warning("No sub-sectors found on MoneyDJ index page.")
        return pd.DataFrame()

    total_sub = len(sub_sectors)
    logger.info("Found %d sub-sectors on MoneyDJ. Starting parallel crawlers...", total_sub)
    
    all_rows = []
    
    def worker(item: tuple[str, str]) -> list[dict]:
        sub_name, code = item
        rows = fetch_moneydj_industry(code, sub_name)
        for r in rows:
            r["大分類"] = ""  # 大分類設為空，由 TWSE 官方產業別提供主要分類
        return rows

    # 使用 ThreadPoolExecutor 平行請求，最高維持 10 個連線
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(worker, item): item for item in sub_sectors}
        for i, future in enumerate(as_completed(futures), 1):
            rows = future.result()
            all_rows.extend(rows)
            if i % 20 == 0 or i == total_sub:
                logger.info("MoneyDJ Crawl progress: [%d/%d] sub-sectors completed.", i, total_sub)

    df = pd.DataFrame(all_rows)
    if not df.empty:
        df = df[["股票代號", "股票名稱", "大分類", "子產業", "產業代碼"]]
        # 移除重複的股票代號，保留第一個對照到的子產業即可
        df = df.drop_duplicates(subset=["股票代號"])
        logger.info("MoneyDJ crawl completed successfully. Total unique stocks: %d", len(df))
    return df


def make_moneydj_lookup(df: pd.DataFrame) -> dict:
    return {
        row["股票代號"]: {"大分類": row["大分類"], "子產業": row["子產業"]}
        for _, row in df.iterrows()
    }


def get_moneydj_sector(stock_code: str, lookup: dict) -> tuple[str, str]:
    info = lookup.get(stock_code, {})
    return info.get("大分類", ""), info.get("子產業", "")
