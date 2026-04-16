from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from app.services.es_service import es_service
from app.schemas.market_info import APIResponse
from app.api.v1.auth import get_current_user
from app.core.logging import logger
from app.core.validators import validate_dates

router = APIRouter()

def _set_cache_headers(response: Response, end_date: str) -> None:
    """Set Cache-Control for historical data. Cache if end_date is in the past."""
    try:
        end = datetime.strptime(end_date, "%Y%m%d").date()
        if end < datetime.now().date():
            response.headers["Cache-Control"] = "public, max-age=86400"
        else:
            response.headers["Cache-Control"] = "private, max-age=300"
    except ValueError:
        pass

@router.get("/spot-market-trades", response_model=APIResponse)
def spot_market_trades(
    start_date: str,
    end_date: str,
    response: Response,
    name: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    validate_dates(start_date, end_date)
    _set_cache_headers(response, end_date)
    es = es_service
    data = es.get_jepx_trades(start_date, end_date, name)
    return {"result": "Success", "code": 0, "count": len(data), "data": data}

@router.get("/spot-market-area-prices", response_model=APIResponse)
def spot_market_area_prices(
    start_date: str,
    end_date: str,
    response: Response,
    name: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    validate_dates(start_date, end_date)
    _set_cache_headers(response, end_date)
    es = es_service
    # Same as trades for now
    data = es.get_jepx_trades(start_date, end_date, name)
    return {"result": "Success", "code": 0, "count": len(data), "data": data}

@router.get("/imbalance", response_model=APIResponse)
def imbalance(
    start_date: str,
    end_date: str,
    response: Response,
    area_name: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    validate_dates(start_date, end_date)
    _set_cache_headers(response, end_date)
    es = es_service
    data = es.get_imbalance_data(start_date, end_date, area_name)
    return {"result": "Success", "code": 0, "count": len(data), "data": data}

@router.get("/hjks", response_model=APIResponse)
def hjks(
    start_date: str,
    end_date: str,
    area_name: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    validate_dates(start_date, end_date)
    es = es_service
    data = es.get_hjks_outages(start_date, end_date, area_name)
    return {"result": "Success", "code": 0, "count": len(data), "data": data}

@router.get("/interconnection", response_model=APIResponse)
def interconnection(
    start_date: str,
    end_date: str,
    line_name: Optional[str] = None,
    interval_minutes: Optional[int] = None,
    current_user = Depends(get_current_user)
):
    validate_dates(start_date, end_date)
    es = es_service
    data = es.get_interconnection_flows(start_date, end_date, line_name, interval_minutes)
    return {"result": "Success", "code": 0, "count": len(data), "data": data}

@router.get("/intraday", response_model=APIResponse)
def intraday(
    start_date: str,
    end_date: str,
    current_user = Depends(get_current_user)
):
    validate_dates(start_date, end_date)
    es = es_service
    data = es.get_intraday_data(start_date, end_date)
    return {"result": "Success", "code": 0, "count": len(data), "data": data}

@router.get("/jepx-system", response_model=APIResponse)
def jepx_system(
    start_date: str,
    end_date: str,
    current_user = Depends(get_current_user)
):
    validate_dates(start_date, end_date)
    es = es_service
    data = es.get_jepx_system_data(start_date, end_date)
    return {"result": "Success", "code": 0, "count": len(data), "data": data}

@router.get("/earthquakes", response_model=APIResponse)
def earthquakes(
    start_date: str,
    end_date: str,
    current_user = Depends(get_current_user)
):
    validate_dates(start_date, end_date)
    es = es_service
    data = es.get_earthquakes(start_date, end_date)
    return {"result": "Success", "code": 0, "count": len(data), "data": data}

@router.get("/occto-area", response_model=APIResponse)
def occto_area(
    start_date: str,
    end_date: str,
    area_name: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    validate_dates(start_date, end_date)
    es = es_service
    data = es.get_occto_area_data(start_date, end_date, area_name)
    return {"result": "Success", "code": 0, "count": len(data), "data": data}

@router.get("/occto-inter", response_model=APIResponse)
def occto_inter(
    start_date: str,
    end_date: str,
    interval_minutes: Optional[int] = None,
    current_user = Depends(get_current_user)
):
    validate_dates(start_date, end_date)
    es = es_service
    data = es.get_occto_interconnection(start_date, end_date, interval_minutes)
    return {"result": "Success", "code": 0, "count": len(data), "data": data}

@router.get("/occto-event", response_model=APIResponse)
def occto_event(
    start_date: str,
    end_date: str,
    current_user = Depends(get_current_user)
):
    validate_dates(start_date, end_date)
    es = es_service
    data = es.get_occto_events(start_date, end_date)
    return {"result": "Success", "code": 0, "count": len(data), "data": data}

@router.get("/battery-data", response_model=APIResponse)
def battery_data(
    start_date: str,
    end_date: str,
    site_id: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    validate_dates(start_date, end_date)
    es = es_service
    data = es.get_battery_data(start_date, end_date, site_id)
    return {"result": "Success", "code": 0, "count": len(data), "data": data}

@router.get("/tdgc", response_model=APIResponse)
def tdgc(
    start_date: str,
    end_date: str,
    area_name: Optional[str] = None,
    data_type: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    validate_dates(start_date, end_date)
    es = es_service
    data = es.get_tdgc_data(start_date, end_date, area_name, data_type)
    return {"result": "Success", "code": 0, "count": len(data), "data": data}

@router.get("/weather-actual", response_model=APIResponse)
def weather_actual(
    start_date: str,
    end_date: str,
    area_name: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    validate_dates(start_date, end_date)
    es = es_service
    data = es.get_weather_actual(start_date, end_date, area_name)
    return {"result": "Success", "code": 0, "count": len(data), "data": data}

@router.get("/weather-actual-daily", response_model=APIResponse)
def weather_actual_daily(
    start_date: str,
    end_date: str,
    area_name: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    validate_dates(start_date, end_date)
    es = es_service
    data = es.get_weather_actual_daily(start_date, end_date, area_name)
    return {"result": "Success", "code": 0, "count": len(data), "data": data}

@router.get("/weather-forecast", response_model=APIResponse)
def weather_forecast(
    start_date: str,
    end_date: str,
    area_name: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    validate_dates(start_date, end_date)
    es = es_service
    data = es.get_weather_forecast(start_date, end_date, area_name)
    return {"result": "Success", "code": 0, "count": len(data), "data": data}

@router.get("/weather-models", response_model=APIResponse)
def weather_models(
    response: Response,
    area_name: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    response.headers["Cache-Control"] = "public, max-age=300"
    es = es_service
    hourly_models = es.get_weather_models(area_name)
    daily_models = es.get_weather_models_daily(area_name)
    # Merge and deduplicate
    model_set: dict = {}
    for m in hourly_models:
        model_set[m['model']] = {'model': m['model'], 'hourly_count': m['doc_count'], 'daily_count': 0}
    for m in daily_models:
        if m['model'] in model_set:
            model_set[m['model']]['daily_count'] = m['doc_count']
        else:
            model_set[m['model']] = {'model': m['model'], 'hourly_count': 0, 'daily_count': m['doc_count']}
    data = sorted(model_set.values(), key=lambda x: x['hourly_count'] + x['daily_count'], reverse=True)
    return {"result": "Success", "code": 0, "count": len(data), "data": data}

@router.get("/weather-forecast-daily", response_model=APIResponse)
def weather_forecast_daily(
    start_date: str,
    end_date: str,
    area_name: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    validate_dates(start_date, end_date)
    es = es_service
    data = es.get_weather_forecast_daily(start_date, end_date, area_name)
    return {"result": "Success", "code": 0, "count": len(data), "data": data}

@router.get("/weather-actual-models", response_model=APIResponse)
def weather_actual_models(
    area_name: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    es = es_service
    data = es.get_weather_models(area_name)
    return {"result": "Success", "code": 0, "count": len(data), "data": data}

@router.get("/weather-actual-daily-models", response_model=APIResponse)
def weather_actual_daily_models(
    area_name: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    es = es_service
    data = es.get_weather_models_daily(area_name)
    return {"result": "Success", "code": 0, "count": len(data), "data": data}

@router.get("/weather-forecast-models", response_model=APIResponse)
def weather_forecast_models(
    area_name: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    es = es_service
    data = es.get_weather_models_forecast(area_name)
    return {"result": "Success", "code": 0, "count": len(data), "data": data}

@router.get("/weather-forecast-daily-models", response_model=APIResponse)
def weather_forecast_daily_models(
    area_name: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    es = es_service
    data = es.get_weather_models_forecast_daily(area_name)
    return {"result": "Success", "code": 0, "count": len(data), "data": data}

@router.get("/bid-plans", response_model=APIResponse)
def bid_plans(
    start_date: str,
    end_date: str,
    site_id: Optional[str] = None,
    commodity_category: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    validate_dates(start_date, end_date)
    es = es_service
    data = es.get_bid_plans(start_date, end_date, site_id, commodity_category)
    return {"result": "Success", "code": 0, "count": len(data), "data": data}
