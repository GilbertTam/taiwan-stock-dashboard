# -*- coding: utf-8 -*-
"""財經 Podcast / YouTube 內容監控分析系統（單檔重構版）。

把原本散在 7 個檔案（config / db / scrapers.youtube / scrapers.gooaye /
pipeline / query + 進入點）的邏輯，重構成「單一檔、多個 class」，並用
dataclass 把資料結構講清楚。資料寫進本專案主 SQLite（與 FastAPI 後端共用，
三張表：podcast_videos / podcast_segments / podcast_mentions）。

─────────────────────────────────────────────────────────────
類別總覽
─────────────────────────────────────────────────────────────
  資料結構   Video / Segment / Mention   — dataclass，欄位即 DB schema
  設定       AgentConfig                 — 頻道清單、語言、模型、開關
  資料層     PodcastRepository           — sqlite3 連線、建表、CRUD、查詢
  抓取       YouTubeScraper              — RSS / yt-dlp / 字幕 / Whisper
             GooayeScraper               — 股癌 SPA(JSON/MD) / Sitemap(HTML)
  分析       ClaudeAnalyzer              — Claude 抽取摘要/題材/段落/情緒
  流程       PodcastAgentPipeline        — 組合上面各 class 的工作流
  進入點     main()                      — argparse CLI

─────────────────────────────────────────────────────────────
安裝相依（核心 web 後端不需要這些，只有跑爬蟲才裝）
─────────────────────────────────────────────────────────────
  pip install -r backend/requirements-podcast.txt
  export ANTHROPIC_API_KEY=...

─────────────────────────────────────────────────────────────
用法
─────────────────────────────────────────────────────────────
  python backend/scripts/podcast_agent.py monitor          # YouTube 監控 + Claude 入庫
  python backend/scripts/podcast_agent.py gooaye           # 股癌 SPA 逐字稿增量同步
  python backend/scripts/podcast_agent.py gooaye-sitemap   # 股癌 Sitemap 歷史增量同步
  python backend/scripts/podcast_agent.py query [top|stock <名稱>|sentiment|sectors]
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import glob
import json
import os
import pathlib
import re
import sqlite3
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass, field
from typing import Any, Optional


# ════════════════════════════════════════════════════════════
#  資料結構（dataclass）— 欄位對齊 DB 三表
# ════════════════════════════════════════════════════════════

@dataclass
class Video:
    """一支影片 / 一集 Podcast 的主資料。"""
    video_id: str                       # YouTube 11 碼；股癌 "gooaye_EPxxxx"
    channel: str = ""
    title: str = ""
    published: str = ""                 # ISO 或 YYYY-MM-DD
    url: str = ""
    status: str = ""                    # done / no_transcript / baseline
    summary: Optional[str] = None
    topics: list[str] = field(default_factory=list)


@dataclass
class Segment:
    """時間軸主題段落。"""
    start: str = ""                     # mm:ss
    end: str = ""                       # mm:ss
    title: str = ""
    topic: str = ""
    content: str = ""


@dataclass
class Mention:
    """個股 / 族群標的的情緒表態。"""
    target: str                         # "台積電" / "AI 伺服器"
    target_type: str = "stock"          # "stock" / "sector"（Claude 輸出鍵為 type）
    ticker: Optional[str] = None        # "2330" / "NVDA"
    sentiment: str = "中立"             # 樂觀 / 悲觀 / 中立
    reason: str = ""


# ════════════════════════════════════════════════════════════
#  設定（取代原 config.py）
# ════════════════════════════════════════════════════════════

@dataclass
class AgentConfig:
    """所有可調整設定集中於此；改這裡就好。"""

    # 要監控的頻道：key = 顯示名稱，value = UC 開頭頻道 ID（RSS 只吃 UC 不吃 @handle）
    channels: dict[str, str] = field(default_factory=lambda: {
        "Gooaye 股癌": "UC23rnlQU_qE3cec9x709peA",
        "游庭皓的財經皓角": "UC0lbAQVpenvfA2QqzsRtL_g",
    })

    # PodSight 回填頻道：slug → 入庫頻道顯示名（與 channels 的顯示名一致才會併同一張卡）
    podsight_channels: dict[str, str] = field(default_factory=lambda: {
        "yutinghao": "游庭皓的財經皓角",
    })

    # 字幕語言優先序（由高到低，挑第一個抓得到的）
    transcript_languages: list[str] = field(
        default_factory=lambda: ["zh-TW", "zh-Hant", "zh-HK", "zh", "en"]
    )

    # 主 SQLite 路徑（與 FastAPI 後端共用）。None = 由 DATABASE_URL 解析。
    db_path: Optional[str] = None

    # 股癌逐字稿與 markdown 筆記輸出位置
    output_dir: str = "data/podcast"
    gooaye_dir: str = "data/gooaye"
    save_markdown: bool = True

    # Claude 設定（需環境變數 ANTHROPIC_API_KEY）
    claude_model: str = "claude-sonnet-4-6"   # 想省錢可換 "claude-haiku-4-5-20251001"
    max_tokens: int = 2000
    max_transcript_chars: int = 120_000        # 逐字稿截斷上限，避免極長影片爆量

    # 首跑：True = 把現有影片設為 baseline（只處理之後新片）；False = 連最新也處理一次
    skip_existing_on_first_run: bool = True

    # 無字幕時是否退而求其次用 Whisper 轉錄（需 yt-dlp + faster-whisper + ffmpeg）
    enable_whisper_fallback: bool = True
    whisper_model: str = "small"               # tiny / base / small / medium / large-v3

    # 繁簡轉換（Whisper 常輸出簡體，建議開；需 pip install opencc）
    convert_to_traditional: bool = True
    opencc_config: str = "s2twp"               # s2twp = 簡轉繁 + 台灣用語

    # 股癌抓取每集間隔（秒），對來源友善
    delay: float = 1.0

    @classmethod
    def from_env(cls) -> "AgentConfig":
        """從環境變數覆寫部分設定後建立。"""
        cfg = cls()
        cfg.db_path = cfg.db_path or resolve_db_path()
        if os.environ.get("PODCAST_CLAUDE_MODEL"):
            cfg.claude_model = os.environ["PODCAST_CLAUDE_MODEL"]
        return cfg


def resolve_db_path() -> str:
    """從 DATABASE_URL 解析出 sqlite 檔路徑；相對路徑對齊 backend 目錄。

    DATABASE_URL 形如 'sqlite+aiosqlite:///./db.sqlite3' 或 'sqlite:///abs/path'。
    backend 目錄 = 本檔（backend/scripts/podcast_agent.py）的祖父目錄。
    """
    backend_dir = pathlib.Path(__file__).resolve().parent.parent
    url = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./db.sqlite3")
    # 去掉 driver 前綴，取出檔案路徑部分
    m = re.search(r":///(.+)$", url)
    raw = m.group(1) if m else "./db.sqlite3"
    p = pathlib.Path(raw)
    if not p.is_absolute():
        p = (backend_dir / raw).resolve()
    return str(p)


# ════════════════════════════════════════════════════════════
#  資料層（取代原 db.py）
# ════════════════════════════════════════════════════════════

SENTIMENTS = ("樂觀", "悲觀", "中立")  # 情緒白名單；不在此一律轉「中立」
_EMOJI = {"樂觀": "📈", "悲觀": "📉", "中立": "➖"}


class PodcastRepository:
    """SQLite 存取層。表結構必須與 app/models/podcast.py 一致。"""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self._conn: Optional[sqlite3.Connection] = None

    @property
    def conn(self) -> sqlite3.Connection:
        if self._conn is None:
            pathlib.Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA journal_mode=WAL")    # 與後端一致，讀寫不互鎖
            conn.execute("PRAGMA busy_timeout=5000")   # 與 API 同時寫時等 5s 而非立刻炸鎖
            conn.execute("PRAGMA foreign_keys=ON")
            self._conn = conn
            self.init_schema()
        return self._conn

    def close(self) -> None:
        """關閉連線（排程器每次跑完釋放，避免連線累積）。"""
        if self._conn is not None:
            self._conn.close()
            self._conn = None

    def init_schema(self) -> None:
        """建立三張表與索引（若不存在）。與 SQLAlchemy create_all 等價。"""
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS podcast_videos (
                video_id     TEXT PRIMARY KEY,
                channel      TEXT,
                title        TEXT,
                published    TEXT,
                url          TEXT,
                status       TEXT,
                summary      TEXT,
                topics       TEXT,
                processed_at TEXT
            );
            CREATE TABLE IF NOT EXISTS podcast_segments (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                video_id TEXT NOT NULL REFERENCES podcast_videos(video_id) ON DELETE CASCADE,
                start    TEXT,
                end      TEXT,
                title    TEXT,
                topic    TEXT,
                content  TEXT
            );
            CREATE TABLE IF NOT EXISTS podcast_mentions (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                video_id    TEXT NOT NULL REFERENCES podcast_videos(video_id) ON DELETE CASCADE,
                target      TEXT NOT NULL,
                target_type TEXT,
                ticker      TEXT,
                sentiment   TEXT,
                reason      TEXT
            );
            CREATE INDEX IF NOT EXISTS ix_podcast_videos_channel_published
                ON podcast_videos(channel, published);
            CREATE INDEX IF NOT EXISTS ix_podcast_mentions_target    ON podcast_mentions(target);
            CREATE INDEX IF NOT EXISTS ix_podcast_mentions_ticker    ON podcast_mentions(ticker);
            CREATE INDEX IF NOT EXISTS ix_podcast_mentions_video     ON podcast_mentions(video_id);
            CREATE INDEX IF NOT EXISTS ix_podcast_mentions_sentiment ON podcast_mentions(sentiment);
            CREATE INDEX IF NOT EXISTS ix_podcast_segments_video     ON podcast_segments(video_id);
        """)
        self.conn.commit()

    # ── 查詢 ──────────────────────────────────────────
    def is_processed(self, video_id: str) -> bool:
        cur = self.conn.execute(
            "SELECT 1 FROM podcast_videos WHERE video_id = ?", (video_id,)
        )
        return cur.fetchone() is not None

    def count_videos(self) -> int:
        return self.conn.execute("SELECT COUNT(*) FROM podcast_videos").fetchone()[0]

    # 回填來源前綴；非這些前綴的 video_id 視為「YouTube 原生集」(11 碼 ID)
    BACKFILL_PREFIXES = ("podsight_", "gooaye_")

    def youtube_dates(self, channel: str) -> set[str]:
        """某頻道已有「YouTube 原生集」的日期集合（YYYY-MM-DD）。

        用途：PodSight 回填時，若某日已有 YouTube（Claude 分析、含情緒）的集，
        就不再用 PodSight 補同一天 —— 以 YouTube 為準。
        published 可能是 ISO datetime 或純日期，一律取前 10 碼比對。
        """
        rows = self.conn.execute(
            "SELECT video_id, substr(published, 1, 10) FROM podcast_videos WHERE channel = ?",
            (channel,),
        ).fetchall()
        return {
            d for vid, d in rows
            if d and not any(vid.startswith(p) for p in self.BACKFILL_PREFIXES)
        }

    def supersede_backfill(self, channel: str, date: str) -> int:
        """某頻道某日有了 YouTube 原生集後，刪掉同日的回填集（PodSight 等），以 YouTube 為準。

        回傳刪除的回填集筆數。明確刪 mentions / segments / videos 三表，
        不依賴 FK cascade（跨 SQLAlchemy 建表與 sqlite3 連線都穩）。
        date 取 YYYY-MM-DD（呼叫端先 slice）。
        """
        if not date:
            return 0
        rows = self.conn.execute(
            "SELECT video_id FROM podcast_videos WHERE channel = ? AND substr(published, 1, 10) = ?",
            (channel, date),
        ).fetchall()
        victims = [
            vid for (vid,) in rows
            if any(vid.startswith(p) for p in self.BACKFILL_PREFIXES)
        ]
        for vid in victims:
            self.conn.execute("DELETE FROM podcast_mentions WHERE video_id = ?", (vid,))
            self.conn.execute("DELETE FROM podcast_segments WHERE video_id = ?", (vid,))
            self.conn.execute("DELETE FROM podcast_videos  WHERE video_id = ?", (vid,))
        self.conn.commit()
        return len(victims)

    # ── 寫入 ──────────────────────────────────────────
    def upsert_video(self, video: Video) -> None:
        """新增或覆寫一筆影片（INSERT OR REPLACE）。"""
        topics_json = (
            json.dumps(video.topics, ensure_ascii=False) if video.topics else None
        )
        self.conn.execute(
            """
            INSERT OR REPLACE INTO podcast_videos
                (video_id, channel, title, published, url,
                 status, summary, topics, processed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                video.video_id, video.channel, video.title, video.published, video.url,
                video.status, video.summary, topics_json,
                dt.datetime.now().isoformat(timespec="seconds"),
            ),
        )
        self.conn.commit()

    def insert_segments(self, video_id: str, segments: list[Segment]) -> None:
        self.conn.executemany(
            """
            INSERT INTO podcast_segments (video_id, start, end, title, topic, content)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [(video_id, s.start, s.end, s.title, s.topic, s.content) for s in segments],
        )
        self.conn.commit()

    def insert_mentions(self, video_id: str, mentions: list[Mention]) -> None:
        """批次寫入情緒；sentiment 白名單防呆、空 ticker 轉 NULL。"""
        rows = []
        for m in mentions:
            sentiment = m.sentiment if m.sentiment in SENTIMENTS else "中立"
            ticker = m.ticker
            if isinstance(ticker, str) and ticker.lower() in ("", "null", "none", "n/a"):
                ticker = None
            rows.append((video_id, m.target, m.target_type, ticker, sentiment, m.reason))
        self.conn.executemany(
            """
            INSERT INTO podcast_mentions
                (video_id, target, target_type, ticker, sentiment, reason)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            rows,
        )
        self.conn.commit()

    # ── 統計查詢（取代原 query.py）────────────────────
    @staticmethod
    def _since(days: int) -> str:
        return f"datetime('now', '-{int(days)} days')"

    def top_targets(self, days: int = 30, limit: int = 25) -> list[sqlite3.Row]:
        return self.conn.execute(f"""
            SELECT m.target, m.ticker, m.target_type,
                   COUNT(*) AS n,
                   SUM(m.sentiment='樂觀') AS bull,
                   SUM(m.sentiment='悲觀') AS bear,
                   SUM(m.sentiment='中立') AS neut
            FROM podcast_mentions m JOIN podcast_videos v ON v.video_id = m.video_id
            WHERE v.processed_at >= {self._since(days)}
            GROUP BY m.target
            ORDER BY n DESC, bull DESC
            LIMIT ?
        """, (limit,)).fetchall()

    def target_history(self, keyword: str) -> list[sqlite3.Row]:
        return self.conn.execute("""
            SELECT v.published, v.title, m.sentiment, m.reason, m.ticker
            FROM podcast_mentions m JOIN podcast_videos v ON v.video_id = m.video_id
            WHERE m.target LIKE ? OR m.ticker = ?
            ORDER BY v.processed_at DESC
        """, (f"%{keyword}%", keyword)).fetchall()

    def sentiment_distribution(self, days: int = 30) -> dict[str, int]:
        rows = self.conn.execute(f"""
            SELECT m.sentiment, COUNT(*) AS n
            FROM podcast_mentions m JOIN podcast_videos v ON v.video_id = m.video_id
            WHERE v.processed_at >= {self._since(days)}
            GROUP BY m.sentiment
        """).fetchall()
        return {r["sentiment"]: r["n"] for r in rows}

    def top_sectors(self, days: int = 30) -> list[sqlite3.Row]:
        return self.conn.execute(f"""
            SELECT m.target, COUNT(*) n,
                   SUM(m.sentiment='樂觀') bull,
                   SUM(m.sentiment='悲觀') bear,
                   SUM(m.sentiment='中立') neut
            FROM podcast_mentions m JOIN podcast_videos v ON v.video_id = m.video_id
            WHERE m.target_type='sector' AND v.processed_at >= {self._since(days)}
            GROUP BY m.target ORDER BY n DESC
        """).fetchall()


# ════════════════════════════════════════════════════════════
#  YouTube 抓取（取代原 scrapers/youtube.py）
# ════════════════════════════════════════════════════════════

class YouTubeScraper:
    """RSS 監控、yt-dlp 列表、字幕抓取、Whisper fallback。重型 import 全 lazy。"""

    FEED_URL = "https://www.youtube.com/feeds/videos.xml?channel_id={}"

    @staticmethod
    def _fmt_time(seconds: float) -> str:
        m, s = int(seconds) // 60, int(seconds) % 60
        return f"{m:02d}:{s:02d}"

    def get_channel_videos_rss(self, channel_id: str, channel_name: str = "") -> list[Video]:
        """從頻道 RSS 抓影片列表。"""
        import feedparser
        feed = feedparser.parse(self.FEED_URL.format(channel_id))
        if feed.bozo and not feed.entries:
            return []
        videos = []
        for entry in feed.entries:
            vid = entry.get("yt_videoid") or entry.get("id", "").split(":")[-1]
            if vid:
                videos.append(Video(
                    video_id=vid,
                    channel=channel_name,
                    title=entry.get("title", ""),
                    published=entry.get("published", ""),
                    url=entry.get("link", f"https://youtu.be/{vid}"),
                ))
        return videos

    def get_channel_videos_yt_dlp(self, channel_url: str) -> list[Video]:
        """用 yt-dlp 抓整個頻道完整影片列表。"""
        result = subprocess.run(
            ["yt-dlp", "--flat-playlist", "--dump-json", channel_url],
            stdout=subprocess.PIPE, text=True, encoding="utf-8",
        )
        videos = []
        for line in result.stdout.splitlines():
            if not line:
                continue
            data = json.loads(line)
            vid = data.get("id")
            videos.append(Video(
                video_id=vid, title=data.get("title", ""),
                url=f"https://youtu.be/{vid}",
            ))
        return videos

    def get_transcript(self, video_id: str, languages: list[str]) -> str:
        """抓 YouTube 內建 / 自動字幕，回傳 '[mm:ss] 文字' 格式。"""
        from youtube_transcript_api import YouTubeTranscriptApi
        fetched = YouTubeTranscriptApi().fetch(video_id, languages=languages)
        raw = fetched.to_raw_data()
        return "\n".join(f"[{self._fmt_time(s['start'])}] {s['text']}" for s in raw)

    def whisper_fallback(self, video_id: str, model_size: str = "small") -> str:
        """無字幕時用 yt-dlp 下載音檔 + faster-whisper 本地轉錄。"""
        from faster_whisper import WhisperModel
        import platform

        with tempfile.TemporaryDirectory() as tmp:
            outtmpl = os.path.join(tmp, "audio.%(ext)s")
            subprocess.run(
                [sys.executable, "-m", "yt_dlp", "-f", "bestaudio", "-o", outtmpl,
                 f"https://www.youtube.com/watch?v={video_id}"],
                check=True,
            )
            files = glob.glob(os.path.join(tmp, "audio.*"))
            if not files:
                raise RuntimeError("yt-dlp 下載音檔失敗")

            size_mb = os.path.getsize(files[0]) / 1024 / 1024
            print(f"  ✅ 音檔下載完成：{os.path.basename(files[0])} ({size_mb:.1f} MB)")

            compute = "int8" if platform.processor() == "arm" else "auto"
            print(f"  ⏳ 載入 Whisper 模型（{model_size}, compute={compute}）...", flush=True)
            model = WhisperModel(model_size, compute_type=compute, num_workers=2)

            print(f"  🎙 開始轉錄（音檔 {size_mb:.1f} MB）...", flush=True)
            segments, _ = model.transcribe(
                files[0], language="zh", beam_size=3,
                vad_filter=True, vad_parameters=dict(min_silence_duration_ms=500),
            )
            lines = []
            for seg in segments:
                line = f"[{self._fmt_time(seg.start)}] {seg.text.strip()}"
                lines.append(line)
                print(f"  {line}", flush=True)
            return "\n".join(lines)


# ════════════════════════════════════════════════════════════
#  股癌抓取（取代原 scrapers/gooaye.py）
# ════════════════════════════════════════════════════════════

class GooayeScraper:
    """股癌逐字稿抓取：SPA(JSON/MD) 與 Sitemap(HTML) 兩路徑。"""

    BASE = "https://whatmkreallysaid.com"
    EPISODES_JSON = f"{BASE}/episodes.json"
    MD_BASE = f"{BASE}/episodes/"
    SEO_URL = f"{BASE}/seo/{{}}.html"
    SITEMAP_URL = f"{BASE}/sitemap.xml"
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                      "Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "zh-TW,zh;q=0.9",
    }

    # ── Path 1：SPA JSON/MD（最新版）────────────────────
    def get_all_episodes_meta(self) -> list[dict]:
        import requests
        print("📡 抓取 episodes.json...")
        resp = requests.get(self.EPISODES_JSON, headers=self.HEADERS, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        print(f"✅ episodes.json 共 {len(data)} 集")
        data.sort(key=lambda x: x.get("number", 0))
        return data

    def fetch_transcript(self, filename: str) -> tuple[Optional[str], str]:
        import requests
        url = self.MD_BASE + requests.utils.quote(filename, safe="")
        try:
            resp = requests.get(url, headers=self.HEADERS, timeout=20)
            return (resp.text, url) if resp.status_code == 200 else (None, url)
        except Exception:
            return None, url

    # ── Path 2：Sitemap/HTML（舊版 fallback）────────────
    def get_episode_numbers_from_sitemap(self) -> list[int]:
        import requests
        from bs4 import BeautifulSoup
        print("📡 抓取 Sitemap...")
        resp = requests.get(self.SITEMAP_URL, headers=self.HEADERS, timeout=10)
        soup = BeautifulSoup(resp.text, "xml")
        nums = []
        for loc in soup.find_all("loc"):
            url = loc.text.strip()
            if "/seo/" in url and url.endswith(".html"):
                num = url.split("/seo/")[1].replace(".html", "")
                if num.isdigit():
                    nums.append(int(num))
        nums.sort()
        if nums:
            print(f"✅ Sitemap 共 {len(nums)} 集：EP{nums[0]} ~ EP{nums[-1]}")
        else:
            print("⚠️ Sitemap 找不到集數")
        return nums

    def scrape_episode(self, ep_num: int) -> Optional[dict]:
        import requests
        from bs4 import BeautifulSoup
        url = self.SEO_URL.format(ep_num)
        try:
            resp = requests.get(url, headers=self.HEADERS, timeout=15)
            if resp.status_code != 200:
                print(f"  ⚠️  EP{ep_num} 狀態碼 {resp.status_code}，跳過")
                return None
            soup = BeautifulSoup(resp.text, "html.parser")

            title_tag = soup.find("h1")
            title = title_tag.get_text(strip=True) if title_tag else f"EP{ep_num}"

            date_text = ""
            for tag in soup.find_all(["p", "span", "div"]):
                text = tag.get_text(strip=True)
                if "日期" in text:
                    date_text = text.replace("日期：", "").strip()
                    break

            transcript = ""
            header = soup.find("h2", string=lambda t: t and "逐字稿" in t)
            if header:
                paras = []
                for sib in header.find_next_siblings():
                    if sib.name == "h2":
                        break
                    text = sib.get_text(separator="\n", strip=True)
                    if text:
                        paras.append(text)
                transcript = "\n\n".join(paras)
            else:
                main = soup.find("main") or soup.find("article") or soup.find("body")
                if main:
                    transcript = main.get_text(separator="\n", strip=True)

            return {
                "ep_num": ep_num, "url": url, "title": title, "date": date_text,
                "transcript": transcript,
                "scraped_at": dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            }
        except Exception as e:
            print(f"  ❌ EP{ep_num} 錯誤：{e}")
            return None


# ════════════════════════════════════════════════════════════
#  PodSight 抓取（已分析好的財經節目摘要回填來源）
# ════════════════════════════════════════════════════════════

class PodSightScraper:
    """PodSight（podsight.tw）已結構化的 AI 摘要回填來源。

    用途：YouTube 頻道的歷史集數若還沒過 Claude，可改用 PodSight 既有的
    摘要 / 個股 / 主題段落直接回填，不需 API key。每集頁面提供：
      - ld+json：headline / description（摘要）/ datePublished
      - .stock-symbol（標的+代號）+ .stock-name（該標的點評，當 reason）
      - .topic-title / .topic-content（主題段落 → segments，無時間戳）
    注意：PodSight 不提供逐檔多空情緒，故 mentions 的 sentiment 一律「中立」。
    """

    BASE = "https://podsight.tw"
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                      "Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "zh-TW,zh;q=0.9",
    }

    def list_episode_dates(self, slug: str) -> list[str]:
        """抓 /{slug}/ 列表頁，回傳所有集數日期（YYYY-MM-DD，新到舊）。"""
        import requests
        url = f"{self.BASE}/{slug}/"
        print(f"📡 抓取 PodSight 列表：{url}")
        resp = requests.get(url, headers=self.HEADERS, timeout=15)
        resp.raise_for_status()
        dates = re.findall(rf'href="/{re.escape(slug)}/(\d{{4}}-\d{{2}}-\d{{2}})/"', resp.text)
        # 去重保序
        seen, out = set(), []
        for d in dates:
            if d not in seen:
                seen.add(d)
                out.append(d)
        print(f"✅ PodSight 共 {len(out)} 集")
        return out

    @staticmethod
    def _parse_ticker(symbol_text: str) -> tuple[str, Optional[str]]:
        """'台積電 (2330)' → ('台積電', '2330')；括號內非代號樣式則回 None。"""
        m = re.match(r"^(.*?)\s*\(([^)]+)\)\s*$", symbol_text.strip())
        if not m:
            return symbol_text.strip(), None
        target, inside = m.group(1).strip(), m.group(2).strip()
        # 代號樣式：台股 4~6 碼數字，或美股 1~5 碼大寫字母
        ticker = inside if re.fullmatch(r"[0-9]{4,6}|[A-Z]{1,5}", inside) else None
        return target, ticker

    def scrape_episode(self, slug: str, date: str) -> Optional[dict]:
        """抓單集頁，回傳 {title, summary, published, url, mentions[], segments[]}。"""
        import json as _json
        import requests
        from html import unescape

        url = f"{self.BASE}/{slug}/{date}/"
        try:
            resp = requests.get(url, headers=self.HEADERS, timeout=20)
            if resp.status_code != 200:
                print(f"  ⚠️  {date} 狀態碼 {resp.status_code}，跳過")
                return None
            h = resp.text

            # ld+json：摘要 + 集名
            title, summary, published = f"{slug} {date}", "", date
            m = re.search(r'<script type="application/ld\+json">(.*?)</script>', h, re.DOTALL)
            if m:
                try:
                    d = _json.loads(m.group(1))
                    summary = d.get("description", "") or ""
                    published = d.get("datePublished", date) or date
                    about = d.get("about") or {}
                    title = (about.get("name") or d.get("headline") or title).strip()
                except _json.JSONDecodeError:
                    pass

            def _clean(s: str) -> str:
                return unescape(re.sub(r"<[^>]+>", "", s)).strip()

            # 個股：symbol + name（name 當點評 reason）
            symbols = re.findall(r'class="stock-symbol"[^>]*>([^<]+)<', h)
            names = re.findall(r'class="stock-name"[^>]*>([^<]+)<', h)
            mentions = []
            for i, sym in enumerate(symbols):
                target, ticker = self._parse_ticker(unescape(sym))
                reason = _clean(names[i]) if i < len(names) else ""
                mentions.append({
                    "target": target, "type": "stock", "ticker": ticker,
                    "sentiment": "中立", "reason": reason,
                })

            # 主題段落 → segments（無時間戳）
            titles = re.findall(r'class="topic-title"[^>]*>([^<]+)<', h)
            contents = re.findall(r'class="topic-content"[^>]*>(.*?)</div>', h, re.DOTALL)
            segments = []
            for i, ttl in enumerate(titles):
                segments.append({
                    "start": "", "end": "", "title": _clean(ttl),
                    "topic": "", "content": _clean(contents[i]) if i < len(contents) else "",
                })

            return {
                "title": title, "summary": summary, "published": published, "url": url,
                "mentions": mentions, "segments": segments,
            }
        except Exception as e:
            print(f"  ❌ {date} 錯誤：{e}")
            return None


# ════════════════════════════════════════════════════════════
#  Claude 分析（取代原 pipeline.py 的 AI 部分）
# ════════════════════════════════════════════════════════════

EXTRACT_PROMPT = """\
你是協助分析財經 podcast / YouTube 內容的助理。請閱讀以下逐字稿，
逐字稿格式為「[mm:ss] 文字」，每行開頭的時間戳代表該段話的起始時間。

影片標題：{title}

逐字稿：
\"\"\"
{transcript}
\"\"\"

請「只輸出一個 JSON 物件」（不要 markdown 標記、不要任何說明文字），格式如下：
{{
  "summary": "用一句繁體中文總結這支影片的核心觀點",

  "topics": ["題材1", "題材2"],

  "segments": [
    {{
      "start":   "mm:ss",
      "end":     "mm:ss",
      "title":   "這段的標題（10字以內）",
      "topic":   "對應的題材名稱",
      "content": "這段的重點說明（2～3句話）"
    }}
  ],

  "mentions": [
    {{
      "target":    "標的名稱（個股用公司名，如 台積電、NVIDIA；族群用類股名，如 AI伺服器、航運）",
      "type":      "stock 或 sector",
      "ticker":    "台股填4位數代號（如 2330），美股填代號（如 NVDA），不確定填 null",
      "sentiment": "樂觀、悲觀 或 中立（只能三選一）",
      "reason":    "用一句話說明主持人為何這樣看"
    }}
  ]
}}

題材分類規則（topics 與 segment.topic 請從以下選擇，找不到對應才自行命名）：
半導體、AI、總經、科技股、航運、金融、能源、電動車、機器人、
雲端、軟體、消費電子、生技醫療、原物料、房地產、加密貨幣、其他

segments 規則：
- 依逐字稿的時間戳，將內容切分成 3～8 個主題段落
- start/end 請對應逐字稿中實際出現的時間戳
- 同一主題連續出現時合併為一段
- end 填下一段的 start；最後一段的 end 填逐字稿最後一個時間戳

mentions 規則：
- 只收錄主持人實際表達看法的標的；單純報新聞、一語帶過的不用收
- 同一標的多次提到，綜合判斷後只給一筆
- 找不到任何標的時，mentions 回傳空陣列 []
- sentiment 只能是「樂觀」「悲觀」「中立」三者之一
"""


class ClaudeAnalyzer:
    """呼叫 Claude 抽取結構化洞察 + 繁簡轉換。"""

    def __init__(self, config: AgentConfig):
        self.config = config
        self._client = None
        self._cc = None

    @property
    def client(self):
        if self._client is None:
            from anthropic import Anthropic
            if not os.environ.get("ANTHROPIC_API_KEY"):
                raise SystemExit("請先設定環境變數 ANTHROPIC_API_KEY 以執行 Claude 分析")
            self._client = Anthropic()
        return self._client

    def to_traditional(self, text: str) -> str:
        """繁簡轉換（OpenCC）；未安裝則原樣回傳。"""
        if not self.config.convert_to_traditional or not text:
            return text
        if self._cc is None:
            try:
                from opencc import OpenCC
                self._cc = OpenCC(self.config.opencc_config)
            except Exception as e:
                print(f"  ⚠ 未安裝 OpenCC，略過繁簡轉換（pip install opencc）：{e}")
                self._cc = False
        return text if self._cc is False else self._cc.convert(text)

    @staticmethod
    def _parse_json(text: str) -> dict:
        text = text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?", "", text).strip()
            text = re.sub(r"```$", "", text).strip()
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            text = m.group(0)
        return json.loads(text)

    def extract(self, title: str, transcript: str) -> dict:
        """送逐字稿給 Claude，回傳 {summary, topics, segments, mentions}。"""
        subset = transcript[: self.config.max_transcript_chars]
        prompt = EXTRACT_PROMPT.format(title=title, transcript=subset)
        msg = self.client.messages.create(
            model=self.config.claude_model,
            max_tokens=self.config.max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = "".join(b.text for b in msg.content if b.type == "text")
        data = self._parse_json(raw)
        data.setdefault("summary", "")
        data.setdefault("topics", [])
        data.setdefault("segments", [])
        data.setdefault("mentions", [])
        return data


# ════════════════════════════════════════════════════════════
#  工作流（取代原 pipeline.py 的 orchestrator）
# ════════════════════════════════════════════════════════════

class PodcastAgentPipeline:
    """組合 Repository / Scrapers / Analyzer 的完整工作流。"""

    def __init__(self, config: AgentConfig):
        self.config = config
        self.repo = PodcastRepository(config.db_path or resolve_db_path())
        self.youtube = YouTubeScraper()
        self.gooaye = GooayeScraper()
        self.podsight = PodSightScraper()
        self.analyzer = ClaudeAnalyzer(config)

    # ── YouTube 監控 + Claude 入庫 ─────────────────────
    def run_youtube_monitor(self) -> None:
        from youtube_transcript_api._errors import (
            YouTubeTranscriptApiException, NoTranscriptFound,
            TranscriptsDisabled, VideoUnavailable,
        )

        all_new: list[Video] = []
        print("檢查頻道更新…")
        for name, cid in self.config.channels.items():
            videos = self.youtube.get_channel_videos_rss(cid, name)
            new_v = [v for v in videos if not self.repo.is_processed(v.video_id)]
            print(f"  {name}：找到 {len(new_v)} 支新片")
            all_new.extend(new_v)

        # 首跑 baseline
        if self.repo.count_videos() == 0 and self.config.skip_existing_on_first_run:
            for v in all_new:
                v.status = "baseline"
                self.repo.upsert_video(v)
            print(f"首次執行：已將現有 {len(all_new)} 支影片設為基準，之後只處理新上架的。")
            return

        done = 0
        for v in all_new:
            print(f"\n▶ 處理：{v.title} ({v.video_id})")
            transcript = None
            try:
                transcript = self.youtube.get_transcript(
                    v.video_id, self.config.transcript_languages
                )
                print("  ✓ 取得現成字幕")
            except (NoTranscriptFound, TranscriptsDisabled, VideoUnavailable) as e:
                if self.config.enable_whisper_fallback:
                    print(f"  無字幕（{type(e).__name__}），改用 Whisper 轉錄…")
                    try:
                        transcript = self.youtube.whisper_fallback(
                            v.video_id, self.config.whisper_model
                        )
                        print("  ✓ Whisper 轉錄完成")
                    except KeyboardInterrupt:
                        print("  ⚠ 使用者中斷，停止所有處理。")
                        break
                    except Exception as we:
                        print(f"  ✗ Whisper 失敗：{we}")
                        v.status = "no_transcript"
                        self.repo.upsert_video(v)
                        continue
                else:
                    print(f"  ⏭ 跳過（無字幕：{type(e).__name__}）")
                    v.status = "no_transcript"
                    self.repo.upsert_video(v)
                    continue
            except YouTubeTranscriptApiException as e:
                print(f"  ⚠ 暫時抽不到，下次重試：{type(e).__name__}")
                continue

            if not transcript:
                v.status = "no_transcript"
                self.repo.upsert_video(v)
                continue

            transcript = self.analyzer.to_traditional(transcript)

            try:
                data = self.analyzer.extract(v.title, transcript)
            except Exception as e:
                print(f"  ✗ 分析/解析失敗，下次重試：{e}")
                continue

            v.status = "done"
            v.summary = data["summary"]
            v.topics = data["topics"]
            self.repo.upsert_video(v)
            self.repo.insert_segments(v.video_id, self._to_segments(data["segments"]))
            self.repo.insert_mentions(v.video_id, self._to_mentions(data["mentions"]))

            # YouTube 為準：刪掉同頻道同日的回填集（PodSight），避免同集兩筆
            superseded = self.repo.supersede_backfill(v.channel, (v.published or "")[:10])
            if superseded:
                print(f"  ↻ 取代同日回填集 {superseded} 筆（改以 YouTube 分析為準）")

            if self.config.save_markdown:
                self._save_video_markdown(v, data)

            print(f"  ✓ 入庫：{len(data['segments'])} 段落 / "
                  f"{len(data['mentions'])} 個標的 / 題材：{', '.join(data['topics'])}")
            done += 1

        print(f"\n完成。本次新增分析 {done} 支。")

    @staticmethod
    def _to_segments(raw: list[dict]) -> list[Segment]:
        return [Segment(
            start=s.get("start", ""), end=s.get("end", ""), title=s.get("title", ""),
            topic=s.get("topic", ""), content=s.get("content", ""),
        ) for s in raw]

    @staticmethod
    def _to_mentions(raw: list[dict]) -> list[Mention]:
        out = []
        for m in raw:
            out.append(Mention(
                target=m.get("target", ""),
                target_type=m.get("type", "stock"),   # Claude 鍵為 type
                ticker=m.get("ticker"),
                sentiment=m.get("sentiment", "中立"),
                reason=m.get("reason", ""),
            ))
        return out

    def _save_video_markdown(self, video: Video, data: dict) -> None:
        day = dt.date.today().isoformat()
        folder = pathlib.Path(self.config.output_dir) / day
        folder.mkdir(parents=True, exist_ok=True)
        safe = "".join(c for c in video.title if c not in '\\/:*?"<>|')[:60]

        lines = [
            f"# {video.title}", "",
            f"- 頻道：{video.channel}",
            f"- 發布：{video.published}",
            f"- 連結：{video.url}",
            f"- 題材：{', '.join(data['topics'])}", "",
            f"**摘要：**{data['summary']}", "",
        ]
        if data["segments"]:
            lines += ["## 段落時間軸", ""]
            for seg in data["segments"]:
                lines.append(
                    f"### `{seg.get('start','')}–{seg.get('end','')}` "
                    f"{seg.get('title','')}　*{seg.get('topic','')}*"
                )
                lines += [seg.get("content", ""), ""]
        if data["mentions"]:
            lines += ["## 個股 / 族群情緒", "",
                      "| 標的 | 類型 | 代號 | 情緒 | 原因 |", "|---|---|---|---|---|"]
            for m in data["mentions"]:
                lines.append(
                    f"| {m.get('target','')} | {m.get('type','')} | "
                    f"{m.get('ticker') or ''} | {m.get('sentiment','')} | "
                    f"{m.get('reason','')} |"
                )
        (folder / f"{video.video_id}_{safe}.md").write_text(
            "\n".join(lines) + "\n", encoding="utf-8"
        )

    # ── PodSight 回填（不需 Claude / API key）──────────
    def run_podsight_sync(self, slug: str, channel_name: str) -> None:
        """用 PodSight 既有 AI 摘要回填某 YouTube 頻道的歷史集數。

        video_id 用 f"podsight_{slug}_{date}"，與 YouTube monitor 的 11 碼 ID
        不衝突（同集可能兩來源各一筆，來源不同視為獨立）。增量：已入庫則跳過。
        """
        dates = self.podsight.list_episode_dates(slug)
        # 該頻道某日已有 YouTube 原生集 → 以 YouTube 為準，不用 PodSight 補
        yt_dates = self.repo.youtube_dates(channel_name)

        already, skipped_yt, to_fetch = 0, 0, []
        for d in dates:
            if self.repo.is_processed(f"podsight_{slug}_{d}"):
                already += 1
            elif d in yt_dates:
                skipped_yt += 1
            else:
                to_fetch.append(d)
        print(f"✅ 共 {len(dates)} 集，已入庫 {already} 集，"
              f"已有 YouTube 資料跳過 {skipped_yt} 集，需回填 {len(to_fetch)} 集。")

        done = 0
        for i, date in enumerate(to_fetch, 1):
            print(f"[{i:3d}/{len(to_fetch)}] {date}...", end=" ")
            ep = self.podsight.scrape_episode(slug, date)
            if not ep:
                continue
            video_id = f"podsight_{slug}_{date}"
            self.repo.upsert_video(Video(
                video_id=video_id,
                channel=channel_name,
                title=ep["title"],
                published=ep["published"],
                url=ep["url"],
                status="done",
                summary=ep["summary"],
                topics=[],
            ))
            self.repo.insert_segments(video_id, self._to_segments(ep["segments"]))
            self.repo.insert_mentions(video_id, self._to_mentions(ep["mentions"]))
            print(f"✅ {len(ep['mentions'])} 標的 / {len(ep['segments'])} 段")
            done += 1
            time.sleep(self.config.delay)

        print(f"\n🎉 PodSight 回填完成：新增 {done} 集（頻道：{channel_name}）")

    # ── 股癌增量同步 ───────────────────────────────────
    def run_gooaye_sync(self, use_sitemap: bool = False) -> None:
        output_dir = self.config.gooaye_dir
        delay = self.config.delay

        existing_by_num: dict[int, dict] = {}
        existing_json = os.path.join(output_dir, "all_episodes.json")
        if os.path.exists(existing_json):
            try:
                with open(existing_json, "r", encoding="utf-8") as f:
                    existing_by_num = {int(ep["ep_num"]): ep for ep in json.load(f)}
                print(f"📋 已載入本機 {len(existing_by_num)} 集歷史記錄。")
            except Exception as e:
                print(f"  ⚠ 讀取 all_episodes.json 失敗，將重新爬取：{e}")

        new_results: list[dict] = []
        failed: list[Any] = []

        if not use_sitemap:
            print("🎙️  股癌 SPA 逐字稿增量下載啟動！")
            meta = self.gooaye.get_all_episodes_meta()
            to_fetch = []
            for ep in meta:
                ep_num = int(ep.get("number", 0))
                md_path = os.path.join(output_dir, "md", f"EP{ep_num:04d}.md")
                if ep_num in existing_by_num and os.path.exists(md_path):
                    continue
                to_fetch.append(ep)
            print(f"✅ 共 {len(meta)} 集，已存在 {len(meta) - len(to_fetch)} 集，"
                  f"僅需下載 {len(to_fetch)} 集。")
            for i, ep in enumerate(to_fetch, 1):
                ep_num = ep.get("number", "?")
                filename = ep.get("filename", "")
                display = ep.get("display_title", ep.get("title", ""))
                print(f"[{i:4d}/{len(to_fetch)}] EP{ep_num} | {display[:35]}...", end=" ")
                if not filename:
                    print("⚠️  無 filename，跳過")
                    failed.append(ep_num)
                    continue
                transcript, url = self.gooaye.fetch_transcript(filename)
                if transcript:
                    new_results.append({
                        "ep_num": ep_num, "title": ep.get("title", ""),
                        "display_title": display, "filename": filename,
                        "date": ep.get("date", ""), "date_display": ep.get("date_display", ""),
                        "summary": ep.get("summary", ""), "transcript": transcript,
                        "char_count": len(transcript), "url": url,
                        "scraped_at": dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    })
                    print(f"✅ {len(transcript):,} 字")
                else:
                    failed.append(ep_num)
                    print("❌ 下載失敗")
                time.sleep(delay)
        else:
            print("🚀 股癌 Sitemap 逐字稿增量爬蟲啟動！")
            nums = self.gooaye.get_episode_numbers_from_sitemap()
            to_fetch = []
            for ep_num in nums:
                txt_path = os.path.join(output_dir, "txt", f"EP{ep_num:04d}.txt")
                if ep_num in existing_by_num and os.path.exists(txt_path):
                    continue
                to_fetch.append(ep_num)
            print(f"✅ 共 {len(nums)} 集，已存在 {len(nums) - len(to_fetch)} 集，"
                  f"僅需下載 {len(to_fetch)} 集。")
            for i, ep_num in enumerate(to_fetch, 1):
                print(f"[{i}/{len(to_fetch)}] 爬取 EP{ep_num}...", end=" ")
                result = self.gooaye.scrape_episode(ep_num)
                if result:
                    new_results.append(result)
                    print(f"✅ 完成（{len(result['transcript'])} 字）")
                else:
                    failed.append(ep_num)
                    print("❌ 失敗")
                time.sleep(delay)

        for ep in new_results:
            existing_by_num[int(ep["ep_num"])] = ep
        all_episodes = [existing_by_num[k] for k in sorted(existing_by_num.keys())]

        print("\n" + "=" * 60)
        print(f"🎉 完成！本次新增/更新 {len(new_results)} 集，失敗 {len(failed)} 集")
        if failed:
            print(f"❌ 失敗集數：{failed}")

        # 增量寫入資料庫（股癌官方 metadata 已含 summary，不過 Claude）
        db_updates = 0
        for ep in all_episodes:
            ep_num = int(ep["ep_num"])
            video_id = f"gooaye_EP{ep_num:04d}"
            if not self.repo.is_processed(video_id):
                self.repo.upsert_video(Video(
                    video_id=video_id,
                    channel="Gooaye 股癌",
                    title=ep.get("display_title") or ep.get("title", f"EP{ep_num}"),
                    published=ep.get("date", ""),
                    url=ep.get("url", ""),
                    status="done",
                    summary=ep.get("summary", ""),
                ))
                db_updates += 1
        if db_updates:
            print(f"  📊 資料庫：已寫入/更新 {db_updates} 集。")

        print("\n📁 儲存結果中...")
        self._save_gooaye_results(output_dir, all_episodes, new_results, failed, use_sitemap)
        print("✅ 全部完成！")

    def _save_gooaye_results(self, output_dir, all_episodes, new_episodes, failed, use_sitemap):
        os.makedirs(output_dir, exist_ok=True)

        with open(os.path.join(output_dir, "all_episodes.json"), "w", encoding="utf-8") as f:
            json.dump(all_episodes, f, ensure_ascii=False, indent=2)

        has_display = not use_sitemap
        csv_path = os.path.join(output_dir, "episodes_summary.csv")
        if has_display:
            fields = ["ep_num", "title", "display_title", "date", "date_display",
                      "char_count", "summary", "url", "scraped_at"]
        else:
            fields = ["ep_num", "title", "date", "url", "scraped_at", "transcript_length"]
        with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
            writer.writeheader()
            if has_display:
                writer.writerows(all_episodes)
            else:
                for ep in all_episodes:
                    writer.writerow({
                        "ep_num": ep["ep_num"], "title": ep["title"], "date": ep["date"],
                        "url": ep["url"], "scraped_at": ep["scraped_at"],
                        "transcript_length": len(ep["transcript"]),
                    })

        if new_episodes:
            sub = "md" if has_display else "txt"
            out_sub = os.path.join(output_dir, sub)
            os.makedirs(out_sub, exist_ok=True)
            for ep in new_episodes:
                path = os.path.join(out_sub, f"EP{ep['ep_num']:04d}.{sub}")
                with open(path, "w", encoding="utf-8") as f:
                    if has_display:
                        f.write(f"---\nep_num: {ep['ep_num']}\ntitle: {ep['title']}\n"
                                f"date: {ep['date']}\nsummary: {ep['summary']}\n---\n\n")
                        f.write(ep["transcript"])
                    else:
                        f.write(f"標題：{ep['title']}\n日期：{ep['date']}\n網址：{ep['url']}\n"
                                f"爬取時間：{ep['scraped_at']}\n" + "=" * 60 + "\n\n")
                        f.write(ep["transcript"])
            print(f"  💾 已寫入 {len(new_episodes)} 個 {sub.upper()} 檔至 {out_sub}/")
        else:
            print("  💾 無新逐字稿檔案需要寫入。")


# ════════════════════════════════════════════════════════════
#  查詢報表（取代原 query.py）
# ════════════════════════════════════════════════════════════

class QueryReporter:
    """把 PodcastRepository 的統計查詢印成人類可讀報表。"""

    def __init__(self, repo: PodcastRepository):
        self.repo = repo

    def top(self, days: int = 30) -> None:
        print(f"\n== 最近 {days} 天熱門標的 ==")
        rows = self.repo.top_targets(days)
        if not rows:
            print("  (還沒有資料)")
            return
        for r in rows:
            tk = f" {r['ticker']}" if r["ticker"] else ""
            tag = "族群" if r["target_type"] == "sector" else "個股"
            print(f"  [{tag}] {r['target']}{tk:<7} 共 {r['n']} 次  "
                  f"📈{r['bull']} 📉{r['bear']} ➖{r['neut']}")

    def stock(self, keyword: str) -> None:
        print(f"\n== 「{keyword}」的提及紀錄 ==")
        rows = self.repo.target_history(keyword)
        if not rows:
            print("  (查無紀錄)")
            return
        for r in rows:
            print(f"  {_EMOJI.get(r['sentiment'],'')} {r['sentiment']}  "
                  f"〈{r['title']}〉\n      理由：{r['reason']}")

    def sentiment(self, days: int = 30) -> None:
        print(f"\n== 最近 {days} 天整體情緒分佈 ==")
        dist = self.repo.sentiment_distribution(days)
        total = sum(dist.values()) or 1
        for s in SENTIMENTS:
            n = dist.get(s, 0)
            bar = "█" * round(n / total * 30)
            print(f"  {_EMOJI[s]} {s}  {n:>3} ({n/total*100:4.1f}%) {bar}")

    def sectors(self, days: int = 30) -> None:
        print(f"\n== 最近 {days} 天類股族群 ==")
        rows = self.repo.top_sectors(days)
        if not rows:
            print("  (還沒有資料)")
            return
        for r in rows:
            print(f"  {r['target']:<12} {r['n']} 次  "
                  f"📈{r['bull']} 📉{r['bear']} ➖{r['neut']}")


# ════════════════════════════════════════════════════════════
#  CLI 進入點
# ════════════════════════════════════════════════════════════

def main() -> None:
    parser = argparse.ArgumentParser(description="財經 Podcast / YouTube 監控分析系統")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("monitor", help="YouTube 頻道監控 + Claude 分析入庫")
    sub.add_parser("gooaye", help="股癌 SPA(JSON/MD) 逐字稿增量同步")
    sub.add_parser("gooaye-sitemap", help="股癌 Sitemap(HTML) 歷史逐字稿增量同步")

    ps = sub.add_parser("podsight", help="用 PodSight 既有摘要回填 YouTube 頻道歷史（免 API key）")
    ps.add_argument("slug", nargs="?", default="yutinghao", help="PodSight slug，預設 yutinghao")
    ps.add_argument("channel", nargs="?", default="游庭皓的財經皓角", help="入庫頻道顯示名")

    q = sub.add_parser("query", help="查詢統計報表")
    q.add_argument("kind", nargs="?", default="top",
                   choices=["top", "stock", "sentiment", "sectors"])
    q.add_argument("arg", nargs="?", default=None, help="stock=關鍵字；其餘=天數")

    args = parser.parse_args()
    config = AgentConfig.from_env()

    if args.command == "monitor":
        PodcastAgentPipeline(config).run_youtube_monitor()
    elif args.command == "gooaye":
        PodcastAgentPipeline(config).run_gooaye_sync(use_sitemap=False)
    elif args.command == "gooaye-sitemap":
        PodcastAgentPipeline(config).run_gooaye_sync(use_sitemap=True)
    elif args.command == "podsight":
        PodcastAgentPipeline(config).run_podsight_sync(args.slug, args.channel)
    elif args.command == "query":
        reporter = QueryReporter(PodcastRepository(config.db_path or resolve_db_path()))
        if args.kind == "stock":
            if not args.arg:
                print("用法：query stock <名稱或代號>")
                return
            reporter.stock(args.arg)
        elif args.kind == "sentiment":
            reporter.sentiment(int(args.arg) if args.arg else 30)
        elif args.kind == "sectors":
            reporter.sectors(int(args.arg) if args.arg else 30)
        else:
            reporter.top(int(args.arg) if args.arg else 30)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
