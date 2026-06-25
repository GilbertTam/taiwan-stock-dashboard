#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

# Run database migrations (if any)
# Run database migrations
alembic upgrade head

# Start the application
#
# 預設單一 worker:本 app 有多個「每行程一份」的單例,多 worker 會各跑一份、
# 互相打架且爆記憶體:
#   - APScheduler(scheduler.py):每 worker 各啟動一份 → 每個 cron job 重複跑 N 次
#     (snapshot/broker batch/retry/podcast sync 全部 ×N,SQLite 互相搶寫鎖)
#   - TPEX Camoufox 共用 browser session(bsr_tpex.py)+ broker Semaphore(1):
#     都是 process 內單例,N worker = N 個 Firefox + 併發失控 → OOM
#   - SQLite 單寫者:多 worker 併發寫易 "database is locked"
# 這類背景工作/瀏覽器/排程的 app 應單行程跑;要橫向擴充得把 web 與
# scheduler/crawler 拆成不同服務,而非靠 uvicorn workers。
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers ${UVICORN_WORKERS:-1}
