import warnings
from typing import List, Union
from pydantic import AnyHttpUrl, validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_INSECURE_DEFAULT_KEY = "django-insecure-h0usnb4^27w+^)i*)f24$i$@#*(^*D(*)W&*(&cj42wsi1n@0&+7@G)"

class Settings(BaseSettings):
    """
    Application configuration settings.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"  # Allow extra fields in .env
    )

    # Environment: "development" or "production"
    ENV: str = "development"

    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "Taiwan Stock Watchlist Dashboard API"

    # SECURITY
    SECRET_KEY: str = _INSECURE_DEFAULT_KEY
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    ALGORITHM: str = "HS256"

    # OAUTH (third-party login)
    # All empty by default — OAuth is disabled unless credentials are set,
    # which causes the providers endpoint to report it off and the frontend
    # buttons to be hidden. Set these in .env to enable.
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    MICROSOFT_CLIENT_ID: str = ""
    MICROSOFT_CLIENT_SECRET: str = ""
    # "common" works for multi-tenant + personal Microsoft accounts.
    MICROSOFT_TENANT: str = "common"
    # Optional override for post-callback browser redirect. Empty = same-origin
    # relative path "/oauth/callback" (works because nginx serves frontend +
    # backend on the same origin in prod).
    FRONTEND_BASE_URL: str = ""

    @property
    def is_production(self) -> bool:
        return self.ENV.lower() == "production"

    @property
    def google_oauth_enabled(self) -> bool:
        return bool(self.GOOGLE_CLIENT_ID and self.GOOGLE_CLIENT_SECRET)

    @property
    def microsoft_oauth_enabled(self) -> bool:
        return bool(self.MICROSOFT_CLIENT_ID and self.MICROSOFT_CLIENT_SECRET)
    
    # CORS
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []

    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # DATABASE
    # Using SQLite by default to match legacy setup
    DATABASE_URL: str = "sqlite+aiosqlite:///./db.sqlite3"


settings = Settings()

# Startup validation
if settings.SECRET_KEY == _INSECURE_DEFAULT_KEY:
    if settings.is_production:
        raise RuntimeError(
            "SECRET_KEY is using the insecure default value. "
            "Set a strong SECRET_KEY environment variable for production."
        )
    warnings.warn(
        "SECRET_KEY is using the insecure default value. "
        "Set SECRET_KEY in your .env file for non-development environments.",
        stacklevel=1,
    )
