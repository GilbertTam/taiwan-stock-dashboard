"""台股庫藏股服務 — 抓 MOPS t35sc09、入庫、查詢。

資料來源:MOPS ajax_t35sc09「買回自己公司股份彙總統計表」(上市 sii + 上櫃 otc)。
回全量歷史 HTML;欄位 index 固定(見 _parse_rows)。日期民國轉 ISO。
狀態衍生:is_done→完成;否則 first_seen 今日→新公告;其餘 執行中。
"""
from __future__ import annotations

import logging
import re
from datetime import date, datetime, timedelta, timezone
from html import unescape
from typing import Any, Optional

import httpx
from sqlalchemy import func, select
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import AsyncSessionLocal
from app.models.treasury import TreasuryBuyback
from app.schemas.treasury import (
    TreasuryListResponse,
    TreasuryOut,
    TreasurySummary,
    TreasurySyncResult,
)

logger = logging.getLogger(__name__)

TPE = timezone(timedelta(hours=8))
MOPS_URL = "https://mopsov.twse.com.tw/mops/web/ajax_t35sc09"
SOURCES = [("sii", "twse"), ("otc", "tpex")]

_PURPOSE = {"1": "轉讓股份予員工", "2": "維護股東權益", "3": "股權轉換"}


def _today_tpe() -> date:
    return datetime.now(TPE).date()


def _to_int(v: Any) -> Optional[int]:
    s = str(v or "").replace(",", "").strip()
    if s in ("", "-", "--"):
        return None
    try:
        return int(float(s))
    except (ValueError, TypeError):
        return None


def _to_float(v: Any) -> Optional[float]:
    s = str(v or "").replace(",", "").strip()
    if s in ("", "-", "--"):
        return None
    try:
        return float(s)
    except (ValueError, TypeError):
        return None


def _roc_to_iso(v: Any) -> str:
    """民國 '97/11/12' → '2008-11-12';取不到回 ''。"""
    s = str(v or "").strip()
    m = re.match(r"^(\d{2,3})/(\d{1,2})/(\d{1,2})$", s)
    if not m:
        return ""
    y, mo, d = int(m.group(1)) + 1911, int(m.group(2)), int(m.group(3))
    if not (1 <= mo <= 12 and 1 <= d <= 31):
        return ""
    return f"{y:04d}-{mo:02d}-{d:02d}"


def _iso_to_dt(iso: str) -> Optional[datetime]:
    try:
        return datetime.strptime(iso, "%Y-%m-%d").replace(tzinfo=TPE) if iso else None
    except (ValueError, TypeError):
        return None


# ─────────────────────────────────────────────
# 抓取 + 解析
# ─────────────────────────────────────────────
def _cells(tr: str) -> list[str]:
    return [
        unescape(re.sub(r"<[^>]+>", "", c)).strip()
        for c in re.findall(r"<td[^>]*>(.*?)</td>", tr, re.DOTALL)
    ]


def _parse_rows(html: str, market: str) -> list[dict]:
    """解析 t35sc09 表格。欄位 index 固定:
    0序號 1代號 2名稱 3董事會決議日 4目的 5金額上限 6預定股數 7價格低 8價格高
    9期間起 10期間迄 11是否完畢 13已買回股數 15已買回% 16已買回金額 17平均價
    """
    rows = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.DOTALL):
        c = _cells(tr)
        if len(c) < 18 or not re.fullmatch(r"[0-9]{4,6}", c[1] or ""):
            continue
        board = _roc_to_iso(c[3])
        if not board:
            continue
        rows.append({
            "code": c[1], "name": c[2], "market": market,
            "board_date": board,
            "purpose": _PURPOSE.get(c[4].strip(), c[4].strip()),
            "amount_cap": _to_int(c[5]),
            "planned_shares": _to_int(c[6]),
            "price_low": _to_float(c[7]),
            "price_high": _to_float(c[8]),
            "period_start": _roc_to_iso(c[9]),
            "period_end": _roc_to_iso(c[10]),
            "is_done": 1 if (c[11] or "").strip().upper() == "Y" else 0,
            "bought_shares": _to_int(c[13]),
            "bought_pct": _to_float(c[15]),
            "bought_amount": _to_int(c[16]),
            "avg_price": _to_float(c[17]),
        })
    return rows


async def _fetch_source(client: httpx.AsyncClient, typek: str, market: str) -> list[dict]:
    ym = _today_tpe()
    roc_ym = f"{ym.year - 1911}{ym.month:02d}"
    try:
        r = await client.post(
            MOPS_URL,
            data={"encodeURIComponent": "1", "step": "1", "firstin": "1",
                  "TYPEK": typek, "yearmonth": roc_ym},
            timeout=40,
        )
        r.raise_for_status()
        html = r.content.decode("utf-8", errors="replace")
    except Exception as e:  # noqa: BLE001
        logger.warning("treasury fetch failed %s: %s", typek, e)
        return []
    return _parse_rows(html, market)


async def sync_treasury() -> TreasurySyncResult:
    """抓 sii+otc → upsert by (code, board_date)。insert 設 first_seen_at,update 不動。"""
    async with httpx.AsyncClient(headers={"User-Agent": "twstock-dashboard/1.0"}) as client:
        all_rows: list[dict] = []
        for typek, market in SOURCES:
            all_rows.extend(await _fetch_source(client, typek, market))

    if not all_rows:
        logger.warning("treasury sync: no rows")
        return TreasurySyncResult()

    today = _today_tpe()
    now = datetime.now(TPE)
    inserted = updated = 0

    async with AsyncSessionLocal() as db:
        existing = {
            (c, b) for c, b in (
                await db.execute(select(TreasuryBuyback.code, TreasuryBuyback.board_date))
            ).all()
        }
        first_run = len(existing) == 0
        for row in all_rows:
            key = (row["code"], row["board_date"])
            # 首次建庫:first_seen=董事會決議日,避免整批亮「新公告」
            fs = (_iso_to_dt(row["board_date"]) or now) if first_run else now
            stmt = sqlite_insert(TreasuryBuyback).values(**row, first_seen_at=fs)
            update_cols = {
                c: getattr(stmt.excluded, c)
                for c in row.keys() if c not in ("code", "board_date")
            }
            update_cols["updated_at"] = func.now()
            stmt = stmt.on_conflict_do_update(
                index_elements=["code", "board_date"], set_=update_cols,
            )
            await db.execute(stmt)
            updated += 1 if key in existing else 0
            inserted += 0 if key in existing else 1
        await db.commit()

        new_today = (
            await db.execute(
                select(func.count()).select_from(TreasuryBuyback)
                .where(func.date(TreasuryBuyback.first_seen_at) == today.isoformat())
            )
        ).scalar() or 0

    logger.info("treasury sync: fetched=%d inserted=%d updated=%d new_today=%d",
                len(all_rows), inserted, updated, new_today)
    return TreasurySyncResult(fetched=len(all_rows), inserted=inserted,
                              updated=updated, new_today=int(new_today))


# ─────────────────────────────────────────────
# 查詢
# ─────────────────────────────────────────────
def _status(r: TreasuryBuyback, today: date) -> str:
    if r.is_done:
        return "完成"
    fs = r.first_seen_at
    is_today = bool(fs and (fs.astimezone(TPE).date() if fs.tzinfo else fs.date()) == today)
    return "新公告" if is_today else "執行中"


def _to_out(r: TreasuryBuyback, today: date) -> TreasuryOut:
    st = _status(r, today)
    return TreasuryOut(
        code=r.code, name=r.name, market=r.market, board_date=r.board_date,
        purpose=r.purpose or "",
        amount_cap=int(r.amount_cap) if r.amount_cap is not None else None,
        planned_shares=int(r.planned_shares) if r.planned_shares is not None else None,
        price_low=float(r.price_low) if r.price_low is not None else None,
        price_high=float(r.price_high) if r.price_high is not None else None,
        period_start=r.period_start or "", period_end=r.period_end or "",
        is_done=bool(r.is_done),
        bought_shares=int(r.bought_shares) if r.bought_shares is not None else None,
        bought_amount=int(r.bought_amount) if r.bought_amount is not None else None,
        bought_pct=float(r.bought_pct) if r.bought_pct is not None else None,
        avg_price=float(r.avg_price) if r.avg_price is not None else None,
        status=st, is_new=(st == "新公告"), first_seen_at=r.first_seen_at,
    )


async def list_treasury(
    db: AsyncSession,
    *,
    status: str = "active",
    market: str = "all",
    query: Optional[str] = None,
    sort: str = "board_date",
) -> TreasuryListResponse:
    """庫藏股列表 + 狀態/市場/搜尋 篩選。status: active|executing|new|done|all。"""
    today = _today_tpe()
    stmt = select(TreasuryBuyback)
    if market in ("twse", "tpex"):
        stmt = stmt.where(TreasuryBuyback.market == market)
    if query:
        q = f"%{query.strip()}%"
        stmt = stmt.where((TreasuryBuyback.code.like(q)) | (TreasuryBuyback.name.like(q)))
    # done 直接 SQL 過濾;active/new 需算 first_seen → 先抓再濾(資料量:active 不多)
    if status == "done":
        stmt = stmt.where(TreasuryBuyback.is_done == 1)
    elif status in ("active", "executing", "new"):
        stmt = stmt.where(TreasuryBuyback.is_done == 0)

    order = {
        "board_date": TreasuryBuyback.board_date.desc(),
        "first_seen": TreasuryBuyback.first_seen_at.desc(),
        "code": TreasuryBuyback.code.asc(),
    }.get(sort, TreasuryBuyback.board_date.desc())
    rows = (await db.execute(stmt.order_by(order))).scalars().all()

    items = [_to_out(r, today) for r in rows]
    if status == "new":
        items = [it for it in items if it.status == "新公告"]
    elif status == "executing":
        items = [it for it in items if it.status == "執行中"]
    # active = 執行中 + 新公告(即 is_done=0,已由 SQL 濾),不再額外篩

    # summary 跨整個(未受 status 篩選)市場/搜尋結果統計各狀態
    base = select(TreasuryBuyback)
    if market in ("twse", "tpex"):
        base = base.where(TreasuryBuyback.market == market)
    if query:
        q = f"%{query.strip()}%"
        base = base.where((TreasuryBuyback.code.like(q)) | (TreasuryBuyback.name.like(q)))
    all_rows = (await db.execute(base)).scalars().all()
    executing = new_today = done = 0
    for r in all_rows:
        s = _status(r, today)
        done += 1 if s == "完成" else 0
        new_today += 1 if s == "新公告" else 0
        executing += 1 if s == "執行中" else 0

    summary = TreasurySummary(
        executing=executing, new_today=new_today, done=done, total=len(items),
    )
    return TreasuryListResponse(summary=summary, items=items)
