"""產業分類查詢服務。

整合兩支爬蟲：
  - twse_tpex_sector → 基礎分類（TWSE 官方產業別）→ concept_reason
  - moneydj          → 子產業（MoneyDJ）            → concept

第一次呼叫會建立對照表並快取成 CSV（預設 data/sector_cache/）。
之後直接讀 CSV，除非 force_rebuild=True 或快取過期。

注意：爬蟲會連外（isin.twse.com.tw / moneydj.com），請在可連外環境執行。
"""
from __future__ import annotations

import logging
import os
import threading
from datetime import datetime, timedelta

import pandas as pd

from app.services.sector_crawlers import twse_tpex_sector as twse
from app.services.sector_crawlers import moneydj

logger = logging.getLogger(__name__)

CACHE_DIR = os.environ.get("SECTOR_CACHE_DIR", "data/sector_cache")
TWSE_CSV = os.path.join(CACHE_DIR, "twse_tpex_industry_map.csv")
MONEYDJ_CSV = os.path.join(CACHE_DIR, "moneydj_industry_map.csv")
CACHE_TTL_DAYS = 7

_lock = threading.Lock()
_twse_lookup: dict | None = None
_moneydj_lookup: dict | None = None


def _is_fresh(path: str) -> bool:
    if not os.path.exists(path):
        return False
    age = datetime.now() - datetime.fromtimestamp(os.path.getmtime(path))
    return age < timedelta(days=CACHE_TTL_DAYS)


def _build_twse() -> dict:
    df = None
    if _is_fresh(TWSE_CSV):
        try:
            df = pd.read_csv(TWSE_CSV, dtype={"股票代號": str})
            if df.empty:
                df = None
        except Exception:
            df = None
            
    if df is None:
        logger.info("Building TWSE/TPEX sector map (crawling isin.twse.com.tw)...")
        df = twse.build_full_table(kinds=["1", "2"])
        if not df.empty:
            os.makedirs(CACHE_DIR, exist_ok=True)
            tmp_path = TWSE_CSV + ".tmp"
            df.to_csv(tmp_path, index=False, encoding="utf-8-sig")
            os.replace(tmp_path, TWSE_CSV)
            
    return twse.make_lookup(df) if df is not None and not df.empty else {}


def _build_moneydj() -> dict:
    df = None
    if _is_fresh(MONEYDJ_CSV):
        try:
            df = pd.read_csv(MONEYDJ_CSV, dtype={"股票代號": str})
            if df.empty:
                df = None
        except Exception:
            df = None
            
    if df is None:
        logger.info("Building MoneyDJ sub-industry map (crawling moneydj.com)...")
        df = moneydj.build_moneydj_table()
        if not df.empty:
            os.makedirs(CACHE_DIR, exist_ok=True)
            tmp_path = MONEYDJ_CSV + ".tmp"
            df.to_csv(tmp_path, index=False, encoding="utf-8-sig")
            os.replace(tmp_path, MONEYDJ_CSV)
            
    return moneydj.make_moneydj_lookup(df) if df is not None and not df.empty else {}


def ensure_loaded(force_rebuild: bool = False) -> None:
    """確保兩張對照表已載入（thread-safe，惰性建立）。"""
    global _twse_lookup, _moneydj_lookup
    with _lock:
        if force_rebuild:
            _twse_lookup = None
            _moneydj_lookup = None
            for p in (TWSE_CSV, MONEYDJ_CSV):
                if os.path.exists(p):
                    os.remove(p)
        if _twse_lookup is None:
            try:
                _twse_lookup = _build_twse()
            except Exception as e:  # noqa: BLE001
                logger.warning("TWSE sector build failed: %s", e)
                _twse_lookup = {}
        if _moneydj_lookup is None:
            try:
                _moneydj_lookup = _build_moneydj()
            except Exception as e:  # noqa: BLE001
                logger.warning("MoneyDJ sector build failed: %s", e)
                _moneydj_lookup = {}


def _safe_str(v) -> str:
    """把 None / NaN(float) / pd.NA / 任意值 統一轉成可被 pydantic 接受的 str。

    起因:moneydj/twse lookup 用 pandas DataFrame,缺值是 numpy.nan (float NaN),
    直接給 pydantic str 欄會炸 (`Input should be a valid string, input_type=float`)。
    """
    if v is None:
        return ""
    # NaN 自己不等於自己;str(nan) 會回 'nan' 字串(也不要)
    if isinstance(v, float) and v != v:
        return ""
    s = str(v).strip()
    if s.lower() in ("nan", "nat", "none", "<na>"):
        return ""
    return s


def classify(code: str, name: str) -> tuple[str, str]:
    """回傳 (concept_reason=基礎分類TWSE, concept=子產業MoneyDJ)。

    保證回 str(不會是 None / NaN),pydantic 直送進 DailyStock 不會炸。
    """
    ensure_loaded()
    base, _market = twse.get_sector(code, name, _twse_lookup or {})
    _main, sub = moneydj.get_moneydj_sector(code, _moneydj_lookup or {})
    return _safe_str(base), _safe_str(sub)
