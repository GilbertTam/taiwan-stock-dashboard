import os
from typing import List, Union, Dict, Any
from pydantic import AnyHttpUrl, EmailStr, validator
from pydantic_settings import BaseSettings, SettingsConfigDict

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

    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "JEPX Spot Price Dashboard API"
    
    # SECURITY
    SECRET_KEY: str = "django-insecure-h0usnb4^27w+^)i*)f24$i$@#*(^*D(*)W&*(&cj42wsi1n@0&+7@G)"  # Default from old settings for dev
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    ALGORITHM: str = "HS256"
    
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

    # ELASTICSEARCH
    ELASTICSEARCH_HOST: str = "localhost"
    ELASTICSEARCH_PORT: str = "9200"
    ELASTICSEARCH_USERNAME: str = ""
    ELASTICSEARCH_PASSWORD: str = ""
    
    # Elasticsearch Index Names
    ES_INDEX_PREDICTION: str = "prediction"
    ES_INDEX_JEPX: str = "jepx_spot_area_price"
    ES_INDEX_JEPX_SYSTEM: str = "jepx_spot_system"
    ES_INDEX_IMBALANCE: str = "imbalance"
    ES_INDEX_HJKS: str = "hjks_outage"
    ES_INDEX_INTERCONNECTION: str = "occto_inter"
    ES_INDEX_INTRADAY: str = "jepx_intraday"
    ES_INDEX_EARTHQUAKE: str = "jma_earthquake_actual"
    ES_INDEX_OCCTO_AREA: str = "occto_area"
    ES_INDEX_OCCTO_INTER: str = "occto_inter"
    ES_INDEX_OCCTO_EVENT: str = "occto_event"
    ES_INDEX_TDGC: str = "tdgc"
    ES_INDEX_WEATHER_ACTUAL: str = "weather_actual"
    ES_INDEX_WEATHER_FORECAST: str = "weather_forecast"
    ES_INDEX_BATTERY_DATA: str = "battery_data"
    ES_INDEX_BID_PLANS: str = "bid_plans"

    @property
    def ELASTICSEARCH_URL(self) -> str:
        return f"{self.ELASTICSEARCH_HOST}:{self.ELASTICSEARCH_PORT}"

    @property
    def ELASTICSEARCH_INDICES(self) -> Dict[str, str]:
        return {
            'prediction': self.ES_INDEX_PREDICTION,
            'jepx': self.ES_INDEX_JEPX,
            'jepx_system': self.ES_INDEX_JEPX_SYSTEM,
            'imbalance': self.ES_INDEX_IMBALANCE,
            'hjks': self.ES_INDEX_HJKS,
            'interconnection': self.ES_INDEX_INTERCONNECTION,
            'intraday': self.ES_INDEX_INTRADAY,
            'earthquake': self.ES_INDEX_EARTHQUAKE,
            'occto_area': self.ES_INDEX_OCCTO_AREA,
            'occto_inter': self.ES_INDEX_OCCTO_INTER,
            'occto_event': self.ES_INDEX_OCCTO_EVENT,
            'tdgc': self.ES_INDEX_TDGC,
            'weather_actual': self.ES_INDEX_WEATHER_ACTUAL,
            'weather_forecast': self.ES_INDEX_WEATHER_FORECAST,
            'battery_data': self.ES_INDEX_BATTERY_DATA,
            'bid_plans': self.ES_INDEX_BID_PLANS,
        }

settings = Settings()
