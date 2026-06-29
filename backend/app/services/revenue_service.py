"""台股月營收服務 — 抓 TWSE/TPEX OpenAPI、入庫、查詢。

資料來源(欄位名兩來源相同,一套 parser 即可):
  TWSE 上市  https://openapi.twse.com.tw/v1/opendata/t187ap05_L
  TWSE 其他  https://openapi.twse.com.tw/v1/opendata/t187ap05_P
  TPEX 上櫃  https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap05_O

金額單位:仟元。資料年月為民國 "11505" → 正規化 "2026-05"。
即時感:upsert by (code, year_month),insert 設 first_seen_at、update 不動,
        新申報 = first_seen_at 為今日。
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional

import httpx
from sqlalchemy import distinct, func, select
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import AsyncSessionLocal
from app.models.revenue import MonthlyRevenue
from app.schemas.revenue import (
    IndustriesResponse,
    MonthlyRevenueOut,
    MonthsResponse,
    RevenueListResponse,
    RevenueSummary,
    RevenueSyncResult,
)

logger = logging.getLogger(__name__)

TPE = timezone(timedelta(hours=8))

# (url, market) — TWSE L/P 都歸 twse,TPEX O 歸 tpex
SOURCES: list[tuple[str, str]] = [
    ("https://openapi.twse.com.tw/v1/opendata/t187ap05_L", "twse"),
    ("https://openapi.twse.com.tw/v1/opendata/t187ap05_P", "twse"),
    ("https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap05_O", "tpex"),
]

_K = {
    "code": "公司代號",
    "name": "公司名稱",
    "industry": "產業別",
    "ym": "資料年月",
    "rev": "營業收入-當月營收",
    "last_m": "營業收入-上月營收",
    "last_y": "營業收入-去年當月營收",
    "mom": "營業收入-上月比較增減(%)",
    "yoy": "營業收入-去年同月增減(%)",
    "cum": "累計營業收入-當月累計營收",
    "cum_ly": "累計營業收入-去年累計營收",
    "cum_yoy": "累計營業收入-前期比較增減(%)",
    "note": "備註",
}


def _today_tpe() -> date:
    return datetime.now(TPE).date()


def _to_int(v: Any) -> Optional[int]:
    if v is None:
        return None
    s = str(v).replace(",", "").strip()
    if s in ("", "-", "--", "N/A"):
        return None
    try:
        return int(float(s))
    except (ValueError, TypeError):
        return None


def _to_float(v: Any) -> Optional[float]:
    if v is None:
        return None
    s = str(v).replace(",", "").strip()
    if s in ("", "-", "--", "N/A"):
        return None
    try:
        return float(s)
    except (ValueError, TypeError):
        return None


def _roc_to_ym(roc: Any) -> Optional[str]:
    """民國 "11505" → "2026-05"。"""
    s = str(roc).strip()
    if not s.isdigit() or len(s) < 5:
        return None
    year = int(s[:-2]) + 1911
    month = int(s[-2:])
    if not (1 <= month <= 12):
        return None
    return f"{year:04d}-{month:02d}"


# ─────────────────────────────────────────────
# 抓取 + 入庫
# ─────────────────────────────────────────────
async def _fetch_source(client: httpx.AsyncClient, url: str, market: str) -> list[dict]:
    """抓單一來源,正規化成統一 dict(含 market)。"""
    try:
        r = await client.get(url, timeout=30)
        r.raise_for_status()
        data = r.json()
    except Exception as e:  # noqa: BLE001
        logger.warning("revenue fetch failed %s: %s", url, e)
        return []
    if not isinstance(data, list):
        return []

    rows = []
    for d in data:
        code = str(d.get(_K["code"], "")).strip()
        ym = _roc_to_ym(d.get(_K["ym"]))
        if not code or not ym:
            continue
        rows.append({
            "code": code,
            "name": str(d.get(_K["name"], "")).strip(),
            "market": market,
            "industry": str(d.get(_K["industry"], "")).strip(),
            "year_month": ym,
            "roc_year_month": str(d.get(_K["ym"], "")).strip(),
            "revenue": _to_int(d.get(_K["rev"])),
            "last_month_revenue": _to_int(d.get(_K["last_m"])),
            "last_year_revenue": _to_int(d.get(_K["last_y"])),
            "mom_pct": _to_float(d.get(_K["mom"])),
            "yoy_pct": _to_float(d.get(_K["yoy"])),
            "cum_revenue": _to_int(d.get(_K["cum"])),
            "cum_last_year": _to_int(d.get(_K["cum_ly"])),
            "cum_yoy_pct": _to_float(d.get(_K["cum_yoy"])),
            "note": str(d.get(_K["note"], "")).strip(),
        })
    return rows


async def sync_monthly_revenue() -> RevenueSyncResult:
    """抓三來源 → upsert by (code, year_month)。insert 設 first_seen_at,update 不動。

    回傳統計。被 scheduler / 手動 API 呼叫。
    """
    async with httpx.AsyncClient(headers={"User-Agent": "twstock-dashboard/1.0"}) as client:
        all_rows: list[dict] = []
        for url, market in SOURCES:
            all_rows.extend(await _fetch_source(client, url, market))

    if not all_rows:
        logger.warning("revenue sync: no rows fetched")
        return RevenueSyncResult()

    today = _today_tpe()
    inserted = updated = 0
    months: set[str] = set()

    async with AsyncSessionLocal() as db:
        # 既有 (code, ym) → 先抓出來判斷 insert/update
        existing = {
            (c, ym)
            for c, ym in (
                await db.execute(select(MonthlyRevenue.code, MonthlyRevenue.year_month))
            ).all()
        }
        for row in all_rows:
            months.add(row["year_month"])
            key = (row["code"], row["year_month"])
            # SQLite upsert:衝突時更新除 first_seen_at 外的欄位
            stmt = sqlite_insert(MonthlyRevenue).values(**row)
            update_cols = {
                c: getattr(stmt.excluded, c)
                for c in row.keys()
                if c not in ("code", "year_month")
            }
            update_cols["updated_at"] = func.now()
            stmt = stmt.on_conflict_do_update(
                index_elements=["code", "year_month"],
                set_=update_cols,
            )
            await db.execute(stmt)
            if key in existing:
                updated += 1
            else:
                inserted += 1
        await db.commit()

        # 今日新申報數(first_seen_at 為今日)
        new_today = (
            await db.execute(
                select(func.count())
                .select_from(MonthlyRevenue)
                .where(func.date(MonthlyRevenue.first_seen_at) == today.isoformat())
            )
        ).scalar() or 0

    logger.info(
        "revenue sync: fetched=%d inserted=%d updated=%d new_today=%d months=%s",
        len(all_rows), inserted, updated, new_today, sorted(months, reverse=True)[:3],
    )
    return RevenueSyncResult(
        months=sorted(months, reverse=True),
        fetched=len(all_rows),
        inserted=inserted,
        updated=updated,
        new_today=int(new_today),
    )


# ─────────────────────────────────────────────
# 查詢
# ─────────────────────────────────────────────
async def _latest_month(db: AsyncSession) -> Optional[str]:
    return (
        await db.execute(select(func.max(MonthlyRevenue.year_month)))
    ).scalar()


def _to_out(r: MonthlyRevenue, today: date) -> MonthlyRevenueOut:
    fs = r.first_seen_at
    is_new = bool(fs and fs.astimezone(TPE).date() == today) if fs and fs.tzinfo else (
        bool(fs and fs.date() == today)
    )
    return MonthlyRevenueOut(
        code=r.code, name=r.name, market=r.market, industry=r.industry,
        year_month=r.year_month,
        revenue=int(r.revenue) if r.revenue is not None else None,
        last_month_revenue=int(r.last_month_revenue) if r.last_month_revenue is not None else None,
        last_year_revenue=int(r.last_year_revenue) if r.last_year_revenue is not None else None,
        mom_pct=float(r.mom_pct) if r.mom_pct is not None else None,
        yoy_pct=float(r.yoy_pct) if r.yoy_pct is not None else None,
        cum_revenue=int(r.cum_revenue) if r.cum_revenue is not None else None,
        cum_yoy_pct=float(r.cum_yoy_pct) if r.cum_yoy_pct is not None else None,
        note=r.note or "",
        first_seen_at=fs,
        is_new=is_new,
    )


async def list_revenue(
    db: AsyncSession,
    *,
    market: str = "all",
    year_month: Optional[str] = None,
    industry: Optional[str] = None,
    min_yoy: Optional[float] = None,
    min_mom: Optional[float] = None,
    new_only: bool = False,
    query: Optional[str] = None,
    sort: str = "first_seen",
) -> RevenueListResponse:
    """月營收列表 + 篩選排序 + summary。year_month 預設最新月。"""
    today = _today_tpe()
    ym = year_month or await _latest_month(db)
    if ym is None:
        return RevenueListResponse(year_month=None)

    stmt = select(MonthlyRevenue).where(MonthlyRevenue.year_month == ym)
    if market in ("twse", "tpex"):
        stmt = stmt.where(MonthlyRevenue.market == market)
    if industry:
        stmt = stmt.where(MonthlyRevenue.industry == industry)
    if min_yoy is not None:
        stmt = stmt.where(MonthlyRevenue.yoy_pct >= min_yoy)
    if min_mom is not None:
        stmt = stmt.where(MonthlyRevenue.mom_pct >= min_mom)
    if new_only:
        stmt = stmt.where(func.date(MonthlyRevenue.first_seen_at) == today.isoformat())
    if query:
        q = f"%{query.strip()}%"
        stmt = stmt.where(
            (MonthlyRevenue.code.like(q)) | (MonthlyRevenue.name.like(q))
        )

    # 排序
    sort_map = {
        "yoy": MonthlyRevenue.yoy_pct.desc(),
        "mom": MonthlyRevenue.mom_pct.desc(),
        "revenue": MonthlyRevenue.revenue.desc(),
        "first_seen": MonthlyRevenue.first_seen_at.desc(),
        "code": MonthlyRevenue.code.asc(),
    }
    stmt = stmt.order_by(sort_map.get(sort, MonthlyRevenue.first_seen_at.desc()))

    rows = (await db.execute(stmt)).scalars().all()
    items = [_to_out(r, today) for r in rows]

    yoys = [it.yoy_pct for it in items if it.yoy_pct is not None]
    summary = RevenueSummary(
        latest_year_month=await _latest_month(db),
        total=len(items),
        new_today=sum(1 for it in items if it.is_new),
        avg_yoy=round(sum(yoys) / len(yoys), 2) if yoys else None,
    )
    return RevenueListResponse(year_month=ym, summary=summary, items=items)


async def list_months(db: AsyncSession) -> MonthsResponse:
    rows = (
        await db.execute(
            select(distinct(MonthlyRevenue.year_month)).order_by(MonthlyRevenue.year_month.desc())
        )
    ).scalars().all()
    return MonthsResponse(months=[m for m in rows if m])


async def list_industries(db: AsyncSession, year_month: Optional[str] = None) -> IndustriesResponse:
    ym = year_month or await _latest_month(db)
    stmt = select(distinct(MonthlyRevenue.industry))
    if ym:
        stmt = stmt.where(MonthlyRevenue.year_month == ym)
    rows = (await db.execute(stmt.order_by(MonthlyRevenue.industry.asc()))).scalars().all()
    return IndustriesResponse(industries=[i for i in rows if i])
