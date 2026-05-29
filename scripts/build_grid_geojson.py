#!/usr/bin/env python3
"""Build japan-grid-regions.geojson by dissolving the 47 prefectures into Japan's
9 electricity grid regions.

Usage:
    python3 scripts/build_grid_geojson.py [--tolerance 0.015] [--out PATH]

Source data: dataofjapan/land prefectures GeoJSON (props: nam_ja, nam, id).
Output: a FeatureCollection with one Feature per grid area; each Feature carries
        properties.area_code matching the codes used in the frontend
        (hokkaido | tohoku | tokyo | chubu | hokuriku | kansai | chugoku |
         shikoku | kyushu).

Notes:
- Shizuoka is treated as fully Tokyo (TEPCO) for simplicity even though its
  western half (Hamamatsu etc.) is actually Chubu Electric territory.
- Okinawa is grouped under Kyushu (Okinawa Electric, but commonly grouped with
  Kyushu in market dashboards).
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from pathlib import Path

from shapely.geometry import shape, mapping
from shapely.ops import unary_union

SOURCE_URL = "https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson"

# Prefecture (nam_ja) → grid area code
PREFECTURE_TO_AREA: dict[str, str] = {
    # Hokkaido
    "北海道": "hokkaido",
    # Tohoku (incl. Niigata under Tohoku Electric)
    "青森県": "tohoku", "岩手県": "tohoku", "宮城県": "tohoku",
    "秋田県": "tohoku", "山形県": "tohoku", "福島県": "tohoku",
    "新潟県": "tohoku",
    # Tokyo (TEPCO: Kanto + Yamanashi + Shizuoka)
    "茨城県": "tokyo", "栃木県": "tokyo", "群馬県": "tokyo",
    "埼玉県": "tokyo", "千葉県": "tokyo", "東京都": "tokyo",
    "神奈川県": "tokyo", "山梨県": "tokyo", "静岡県": "tokyo",
    # Chubu
    "愛知県": "chubu", "岐阜県": "chubu", "三重県": "chubu",
    "長野県": "chubu",
    # Hokuriku
    "富山県": "hokuriku", "石川県": "hokuriku", "福井県": "hokuriku",
    # Kansai
    "滋賀県": "kansai", "京都府": "kansai", "大阪府": "kansai",
    "兵庫県": "kansai", "奈良県": "kansai", "和歌山県": "kansai",
    # Chugoku
    "鳥取県": "chugoku", "島根県": "chugoku", "岡山県": "chugoku",
    "広島県": "chugoku", "山口県": "chugoku",
    # Shikoku
    "徳島県": "shikoku", "香川県": "shikoku", "愛媛県": "shikoku",
    "高知県": "shikoku",
    # Kyushu (incl. Okinawa)
    "福岡県": "kyushu", "佐賀県": "kyushu", "長崎県": "kyushu",
    "熊本県": "kyushu", "大分県": "kyushu", "宮崎県": "kyushu",
    "鹿児島県": "kyushu", "沖縄県": "kyushu",
}

AREA_META = {
    "hokkaido": {"name_en": "Hokkaido", "name_ja": "北海道",  "utility": "Hokkaido Electric"},
    "tohoku":   {"name_en": "Tohoku",   "name_ja": "東北",    "utility": "Tohoku Electric"},
    "tokyo":    {"name_en": "Tokyo",    "name_ja": "東京",    "utility": "TEPCO"},
    "chubu":    {"name_en": "Chubu",    "name_ja": "中部",    "utility": "Chubu Electric"},
    "hokuriku": {"name_en": "Hokuriku", "name_ja": "北陸",    "utility": "Hokuriku Electric"},
    "kansai":   {"name_en": "Kansai",   "name_ja": "関西",    "utility": "Kansai Electric"},
    "chugoku":  {"name_en": "Chugoku",  "name_ja": "中国",    "utility": "Chugoku Electric"},
    "shikoku":  {"name_en": "Shikoku",  "name_ja": "四国",    "utility": "Shikoku Electric"},
    "kyushu":   {"name_en": "Kyushu",   "name_ja": "九州",    "utility": "Kyushu Electric"},
}

ORDER = ["hokkaido", "tohoku", "tokyo", "chubu", "hokuriku",
         "kansai", "chugoku", "shikoku", "kyushu"]


def fetch_source() -> dict:
    print(f"Fetching {SOURCE_URL} ...", file=sys.stderr)
    with urllib.request.urlopen(SOURCE_URL, timeout=30) as r:
        return json.loads(r.read())


def build(tolerance: float) -> dict:
    src = fetch_source()
    by_area: dict[str, list] = {code: [] for code in ORDER}
    unknown: list[str] = []
    for feat in src["features"]:
        name = feat["properties"].get("nam_ja", "")
        code = PREFECTURE_TO_AREA.get(name)
        if not code:
            unknown.append(name)
            continue
        by_area[code].append(shape(feat["geometry"]))

    if unknown:
        print(f"WARN unmatched prefectures: {unknown}", file=sys.stderr)

    features = []
    for code in ORDER:
        polys = by_area[code]
        if not polys:
            print(f"WARN no polygons for {code}", file=sys.stderr)
            continue
        merged = unary_union(polys)
        if tolerance > 0:
            # preserve_topology keeps polygons from breaking apart
            merged = merged.simplify(tolerance, preserve_topology=True)
        features.append({
            "type": "Feature",
            "properties": {"area_code": code, **AREA_META[code]},
            "geometry": mapping(merged),
        })

    return {
        "type": "FeatureCollection",
        "name": "japan-grid-regions",
        "crs": {"type": "name", "properties": {"name": "EPSG:4326"}},
        "features": features,
    }


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--tolerance", type=float, default=0.015,
                   help="Polygon simplification tolerance in degrees (~1.6km at 0.015). 0 disables.")
    p.add_argument("--out", type=Path,
                   default=Path("frontend/electricity-market-prediction/public/maps/japan-grid-regions.geojson"))
    args = p.parse_args()

    fc = build(args.tolerance)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(fc, f, ensure_ascii=False, separators=(",", ":"))

    size = args.out.stat().st_size
    print(f"Wrote {args.out} ({len(fc['features'])} features, {size/1024:.1f} KB, tolerance={args.tolerance})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
