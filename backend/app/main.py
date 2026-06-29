from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from app.config import settings

from app.core.logging import setup_logging
from app.core.exceptions import (
    http_exception_handler,
    validation_exception_handler,
    generic_exception_handler,
)
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

def create_application() -> FastAPI:
    setup_logging()
    
    application = FastAPI(
        title=settings.PROJECT_NAME,
        openapi_url=None,  # Disable default openapi.json
        docs_url=None,     # Disable default /docs
        redoc_url=None,    # Disable default /redoc
    )

    # GZip compression for responses > 1KB
    application.add_middleware(GZipMiddleware, minimum_size=1000)

    # Trust X-Forwarded-Proto / X-Forwarded-For / X-Forwarded-Host from the
    # reverse proxy so `request.url.scheme` and `request.base_url` reflect
    # the ACTUAL public scheme (e.g. https) instead of nginx→backend's hop
    # (which is always http inside the docker network).
    #
    # Without this, OAuth `redirect_uri` URIs built from request.base_url are
    # http://… → Google/Microsoft redirect the browser back over http → the
    # entire OAuth callback chain drops to http and the secure session cookie
    # set by the callback cannot be sent back over the next https request.
    #
    # `trusted_hosts="*"` is safe in this deployment: the backend container is
    # only reachable via the nginx container on the internal docker network.
    # If the backend ever becomes directly internet-reachable, restrict this
    # to the nginx container IP/hostname.
    application.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

    # Protected Documentation Routes
    from fastapi import Depends
    from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
    from fastapi.openapi.utils import get_openapi
    from app.api.v1.auth import get_current_active_user

    @application.get(f"{settings.API_V1_STR}/docs", include_in_schema=False)
    async def get_documentation(current_user = Depends(get_current_active_user)):
        return get_swagger_ui_html(openapi_url=f"{settings.API_V1_STR}/openapi.json", title=f"{settings.PROJECT_NAME} - Swagger UI")

    @application.get(f"{settings.API_V1_STR}/redoc", include_in_schema=False)
    async def get_redoc_documentation(current_user = Depends(get_current_active_user)):
        return get_redoc_html(openapi_url=f"{settings.API_V1_STR}/openapi.json", title=f"{settings.PROJECT_NAME} - ReDoc")

    @application.get(f"{settings.API_V1_STR}/openapi.json", include_in_schema=False)
    async def get_open_api_endpoint(current_user = Depends(get_current_active_user)):
        return get_openapi(title=settings.PROJECT_NAME, version="1.0.0", routes=application.routes)


    # Set all CORS enabled origins
    cors_origins = (
        [str(origin) for origin in settings.BACKEND_CORS_ORIGINS]
        if settings.BACKEND_CORS_ORIGINS
        else ["http://localhost:3000", "http://localhost:8000", "http://localhost:6873"]
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )
        
    # Register Exception Handlers
    application.add_exception_handler(StarletteHTTPException, http_exception_handler)
    application.add_exception_handler(RequestValidationError, validation_exception_handler)
    application.add_exception_handler(Exception, generic_exception_handler)
    
    # Include API Router
    from app.api.v1.router import api_router
    application.include_router(api_router, prefix=settings.API_V1_STR)

    return application

app = create_application()


@app.on_event("startup")
async def ensure_tables():
    """Create any missing tables on startup (e.g. user_presets for fresh instances).

    NOTE: create_all only CREATES missing tables; it does NOT alter existing
    ones. Existing deployments that pre-date migration 003 must run
    `alembic upgrade head` to pick up the `users.hashed_password` nullability
    change and the new `is_pending` column. Fresh installs get the correct
    schema from the updated models here.
    """
    from app.db import engine, Base
    # Import all models so Base.metadata sees them before create_all runs.
    from app.models import (  # noqa: F401
        User,
        OAuthAccount,
        AppSettings,
        UserPreference,
        Stock,
        BrokerSnapshot,
        BrokerEntry,
        DailyLimitUpSnapshot,
        PodcastVideo,
        PodcastSegment,
        PodcastMention,
        PodcastQA,
        MonthlyRevenue,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Pre-build sector maps asynchronously at startup
    import threading
    from app.services import stock_sector
    threading.Thread(target=stock_sector.ensure_loaded, daemon=True).start()

    # Start the daily 14:45 broker batch scheduler (Asia/Taipei)
    from app.services.scheduler import start_scheduler
    start_scheduler()

    # 重啟後馬上 reschedule 卡在 pending 的 snapshot —
    # 容器重啟會把 background task 全部 kill,DB 內 status=pending 的 snapshot
    # 變成「孤兒」(沒人接續抓取),前端輪詢會永遠看到 pending。
    # 這裡用 asyncio.create_task 非阻塞地在背景跑,不擋 startup。
    async def _reschedule_orphan_pendings():
        import asyncio
        # 等 5 秒讓 scheduler / DB 都初始化完
        await asyncio.sleep(5)
        try:
            from app.services import broker_service
            stuck = await broker_service.list_today_stuck_pending(min_age_minutes=0)
            if stuck:
                queued = []
                for item in stuck:
                    result = await broker_service.force_recrawl(
                        item["code"], name=item["name"], market=item["market"],
                    )
                    if result == "pending":
                        queued.append(item["code"])
                from loguru import logger as _logger
                _logger.info(
                    "startup: rescheduled %d/%d orphan pending snapshots (%s)",
                    len(queued), len(stuck), queued[:5],
                )
        except Exception:  # noqa: BLE001
            from loguru import logger as _logger
            _logger.exception("startup: reschedule orphan pendings failed")
    import asyncio as _asyncio
    _asyncio.create_task(_reschedule_orphan_pendings())

    # 啟動時自動補洞:修補因 stack 當掉/漏跑而缺的當日漲停 snapshot。
    # 當日漲停來源(OpenAPI)只回最新交易日,漏掉的日子要靠歷史 OHLCV 重建。
    # 非阻塞背景跑,不擋 startup。
    async def _fill_missing_snapshots_on_startup():
        import asyncio
        await asyncio.sleep(8)  # 等 DB / scheduler 初始化
        try:
            from app.services import daily_snapshot_service
            result = await daily_snapshot_service.fill_missing_snapshots(lookback_days=10)
            from loguru import logger as _logger
            _logger.info("startup: fill_missing_snapshots {}", result)
        except Exception:  # noqa: BLE001
            from loguru import logger as _logger
            _logger.exception("startup: fill_missing_snapshots failed")
    _asyncio.create_task(_fill_missing_snapshots_on_startup())

    # 啟動時補月營收歷史:t187ap05 OpenAPI 只給當月,歷史靠 MOPS 回填。
    # 若 DB 為空先 sync 當月;歷史月數太薄(<12)才 backfill(有 guard,不會每次重打)。
    async def _ensure_revenue_history_on_startup():
        import asyncio
        await asyncio.sleep(12)
        try:
            from app.services import revenue_service
            from app.db import AsyncSessionLocal
            from loguru import logger as _logger
            async with AsyncSessionLocal() as db:
                months = (await revenue_service.list_months(db)).months
            if not months:
                await revenue_service.sync_monthly_revenue()
                async with AsyncSessionLocal() as db:
                    months = (await revenue_service.list_months(db)).months
            if len(months) < 12:
                r = await revenue_service.backfill_history(months=24)
                _logger.info("startup: revenue backfill filled {} months", len(r["months"]))
            else:
                _logger.info("startup: revenue history ok ({} months), skip backfill", len(months))
        except Exception:  # noqa: BLE001
            from loguru import logger as _logger
            _logger.exception("startup: revenue backfill failed")
    _asyncio.create_task(_ensure_revenue_history_on_startup())

    # 啟動時催一次 podcast 增量(gooaye + PodSight):漏掉的集數立即補,不必等 08:30。
    # 增量(跳過已抓),有資料時很輕(各 1 個列表請求);丟 worker thread 不擋 loop。
    async def _podcast_catchup_on_startup():
        import asyncio
        await asyncio.sleep(20)
        try:
            from app.services.scheduler import _run_podcast_sync_blocking
            from loguru import logger as _logger
            await asyncio.to_thread(_run_podcast_sync_blocking)
            _logger.info("startup: podcast catch-up done")
        except Exception:  # noqa: BLE001
            from loguru import logger as _logger
            _logger.exception("startup: podcast catch-up failed")
    _asyncio.create_task(_podcast_catchup_on_startup())


@app.on_event("shutdown")
async def stop_background_jobs():
    from app.services.scheduler import stop_scheduler
    stop_scheduler()
    # 關掉 TPEX Camoufox 共用 session(若曾開過)
    try:
        from app.services.broker_crawlers import shutdown_tpex_session
        await shutdown_tpex_session()
    except Exception:  # noqa: BLE001
        pass


@app.get("/")
async def root():
    return {"message": "FastAPI Backend is running"}
