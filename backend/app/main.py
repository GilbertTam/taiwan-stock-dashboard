from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
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
        allow_methods=["GET", "POST", "OPTIONS"],
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

@app.get("/")
async def root():
    return {"message": "FastAPI Backend is running"}
