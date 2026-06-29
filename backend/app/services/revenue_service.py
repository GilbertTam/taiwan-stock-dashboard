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
import re
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
    RevenueHistoryPoint,
    RevenueHistoryResponse,
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
    "report": "出表日期",
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


def _roc_date_to_iso(roc: Any) -> Optional[str]:
    """出表日 民國 "1150617" → "2026-06-17"。"""
    s = str(roc).strip()
    if not s.isdigit() or len(s) < 7:
        return None
    year = int(s[:-4]) + 1911
    month = int(s[-4:-2])
    day = int(s[-2:])
    if not (1 <= month <= 12 and 1 <= day <= 31):
        return None
    return f"{year:04d}-{month:02d}-{day:02d}"


def _iso_to_dt(iso: Optional[str]) -> Optional[datetime]:
    """ "2026-06-17" → 當日 00:00 (台北 tz-aware)。"""
    if not iso:
        return None
    try:
        return datetime.strptime(iso, "%Y-%m-%d").replace(tzinfo=TPE)
    except (ValueError, TypeError):
        return None


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
            "report_date": _roc_date_to_iso(d.get(_K["report"])) or "",
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
    now = datetime.now(TPE)
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
        # 首次建庫(table 空):把 first_seen_at 設為出表日,避免 mid-month 部署整批變「新」。
        first_run = len(existing) == 0

        for row in all_rows:
            months.add(row["year_month"])
            key = (row["code"], row["year_month"])
            # insert 時的 first_seen_at:首次建庫用出表日,否則用現在(=真正新出現→今日→新申報)
            fs = (_iso_to_dt(row["report_date"]) or now) if first_run else now
            # SQLite upsert:衝突時更新除 first_seen_at 外的欄位
            stmt = sqlite_insert(MonthlyRevenue).values(**row, first_seen_at=fs)
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
# 歷史回填(MOPS t21sc03 月營收彙總,給直方圖歷史)
# ─────────────────────────────────────────────
# OpenAPI t187ap05 只給「當月」;歷史月份從 MOPS 彙總表回填。
# 上市 sii、上櫃 otc;Big5(cp950) 編碼。欄位:code,name,當月,上月,去年當月,
# MoM%,累計,去年累計,累計增減%;YoY 由 (當月-去年當月)/去年當月 計算。
_MOPS_HIST_URL = "https://mopsov.twse.com.tw/nas/t21/{sub}/t21sc03_{roc}_{m}_0.html"


def _parse_mops_html(text: str, market: str, year_month: str) -> list[dict]:
    rows: list[dict] = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", text, re.DOTALL):
        cells = [
            re.sub(r"<[^>]+>", "", c).strip()
            for c in re.findall(r"<td[^>]*>(.*?)</td>", tr, re.DOTALL)
        ]
        if len(cells) < 9 or not re.fullmatch(r"[0-9]{4}", cells[0] or ""):
            continue
        cur = _to_int(cells[2])
        last_m = _to_int(cells[3])
        last_y = _to_int(cells[4])
        mom = _to_float(cells[5])
        cum = _to_int(cells[6])
        cum_ly = _to_int(cells[7])
        cum_yoy = _to_float(cells[8])
        yoy = (
            round((cur - last_y) / last_y * 100, 4)
            if cur is not None and last_y not in (None, 0) else None
        )
        rows.append({
            "code": cells[0], "name": cells[1].strip(), "market": market,
            "industry": "", "year_month": year_month, "roc_year_month": "",
            "report_date": "", "revenue": cur, "last_month_revenue": last_m,
            "last_year_revenue": last_y, "mom_pct": mom, "yoy_pct": yoy,
            "cum_revenue": cum, "cum_last_year": cum_ly, "cum_yoy_pct": cum_yoy,
            "note": "",
        })
    return rows


async def backfill_history(months: int = 24) -> dict:
    """從 MOPS 回填過去 N 個月的月營收(供歷史直方圖)。

    一次性重量級工作(N×2 個 HTTP)。已存在的 (code, year_month) 會更新數字但
    不動 first_seen_at(維持非「新」);回填列 first_seen_at 設為該月,不會誤亮新。
    """
    today = _today_tpe()
    # 從上個月往回 N 個月(當月由 OpenAPI 即時 sync 負責)
    targets: list[tuple[int, int]] = []
    y, m = today.year, today.month
    for _ in range(months):
        m -= 1
        if m == 0:
            m = 12
            y -= 1
        targets.append((y, m))

    inserted = updated = 0
    done_months: list[str] = []

    async with httpx.AsyncClient(headers={"User-Agent": "Mozilla/5.0"}) as client:
        for (yy, mm) in targets:
            ym = f"{yy:04d}-{mm:02d}"
            roc = yy - 1911
            batch: list[dict] = []
            for sub, market in (("sii", "twse"), ("otc", "tpex")):
                url = _MOPS_HIST_URL.format(sub=sub, roc=roc, m=mm)
                try:
                    r = await client.get(url, timeout=30)
                    if r.status_code != 200:
                        continue
                    html = r.content.decode("cp950", errors="replace")
                except Exception as e:  # noqa: BLE001
                    logger.warning("backfill fetch failed %s: %s", url, e)
                    continue
                batch.extend(_parse_mops_html(html, market, ym))

            if not batch:
                continue
            fs = _iso_to_dt(f"{ym}-01") or datetime.now(TPE)
            async with AsyncSessionLocal() as db:
                existing = {
                    c for (c,) in (
                        await db.execute(
                            select(MonthlyRevenue.code).where(MonthlyRevenue.year_month == ym)
                        )
                    ).all()
                }
                for row in batch:
                    stmt = sqlite_insert(MonthlyRevenue).values(**row, first_seen_at=fs)
                    # 不覆寫 OpenAPI 當月 sync 寫好的這些(歷史回填值多為空/次要)
                    update_cols = {
                        c: getattr(stmt.excluded, c)
                        for c in row.keys()
                        if c not in ("code", "year_month", "name", "industry",
                                     "report_date", "roc_year_month")
                    }
                    update_cols["updated_at"] = func.now()
                    stmt = stmt.on_conflict_do_update(
                        index_elements=["code", "year_month"], set_=update_cols,
                    )
                    await db.execute(stmt)
                    if row["code"] in existing:
                        updated += 1
                    else:
                        inserted += 1
                await db.commit()
            done_months.append(ym)
            logger.info("backfill %s: %d rows", ym, len(batch))

    logger.info("revenue backfill done: months=%d inserted=%d updated=%d", len(done_months), inserted, updated)
    return {"months": done_months, "inserted": inserted, "updated": updated}


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
        report_date=r.report_date or None,
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


async def get_history(db: AsyncSession, code: str) -> RevenueHistoryResponse:
    """單一公司全部月份歷史(依年月升冪),供展開面板的直方圖 + 歷史表。"""
    rows = (
        await db.execute(
            select(MonthlyRevenue)
            .where(MonthlyRevenue.code == code)
            .order_by(MonthlyRevenue.year_month.asc())
        )
    ).scalars().all()
    if not rows:
        return RevenueHistoryResponse(code=code)
    latest = rows[-1]
    return RevenueHistoryResponse(
        code=code,
        name=latest.name or "",
        market=latest.market or "",
        industry=latest.industry or "",
        points=[
            RevenueHistoryPoint(
                year_month=r.year_month,
                revenue=int(r.revenue) if r.revenue is not None else None,
                mom_pct=float(r.mom_pct) if r.mom_pct is not None else None,
                yoy_pct=float(r.yoy_pct) if r.yoy_pct is not None else None,
            )
            for r in rows
        ],
    )


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
