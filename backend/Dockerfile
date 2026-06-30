# syntax=docker/dockerfile:1

# ---- Build stage: compile C extensions, install all deps ----
FROM python:3.11-slim-bookworm AS builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# gcc + libpq-dev are needed to compile C extensions (argon2-cffi, cryptography).
# They are only needed at build time; the runtime stage does not include them.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# BuildKit cache mount: pip's HTTP/wheel cache persists on the host between builds.
# On warm builds with no requirements.txt changes, completes in ~5-10 sec instead of ~90 sec.
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip setuptools && \
    pip install -r requirements.txt

# podcast 相依:YouTube monitor/backfill 用(RSS + 字幕 + 全頻道枚舉)。
# LLM 走 OpenRouter(requests)不需 anthropic SDK;faster-whisper/opencc 仍不裝。
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install feedparser youtube-transcript-api yt-dlp

# 預下載 Camoufox 用的 patched Firefox(避免 runtime 第一次抓 TPEX 時下載 ~200MB)
RUN python -m camoufox fetch || true

# ---- Runtime stage: lean image without build tools ----
FROM python:3.11-slim-bookworm AS runtime

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 1. Copy installed Python packages from builder(必須先有 playwright 才能跑 install-deps)
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
# Camoufox fetch 下載的 patched Firefox 放在 ~/.cache/camoufox,搬到 runtime
COPY --from=builder /root/.cache/camoufox /root/.cache/camoufox

# 2. 裝 Firefox 執行時需要的 X / GTK / fontconfig lib。
#    用 playwright 官方 install-deps firefox 抓完整清單,
#    比手動列穩(Debian release 不同包名可能變)。
#    再加中文 + 拉丁字型(BSR 頁面有 CJK)。
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates wget gnupg \
    && playwright install-deps firefox \
    && apt-get install -y --no-install-recommends \
        fonts-noto-cjk fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Copy source code last so source-only changes don't invalidate the pip install layer above.
COPY . .

RUN chmod +x docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]
