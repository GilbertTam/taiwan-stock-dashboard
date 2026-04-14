from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.services.es_service import es_service
from app.api.v1.auth import get_current_user

router = APIRouter()


@router.get("/coverage")
def get_coverage(
    start_date: str = Query(..., description="Start date in YYYYMMDD format"),
    end_date: str = Query(..., description="End date in YYYYMMDD format"),
    current_user=Depends(get_current_user),
):
    """
    Returns per-day document counts for each data source and area
    for the given date range.
    """
    rows = es_service.get_data_coverage(start_date=start_date, end_date=end_date)
    return {
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "start_date": start_date,
        "end_date": end_date,
        "rows": rows,
    }


@router.get("/sources")
def get_coverage_sources(
    current_user=Depends(get_current_user),
):
    """
    Returns the currently available prediction model names and TDGC commodity categories
    from Elasticsearch. Use this to dynamically populate source selectors without hardcoding.
    """
    return es_service.get_coverage_sources()


@router.get("/preview")
def get_coverage_preview(
    source_key: str = Query(..., description="Source key, e.g. 'spot_price', 'tdgc_1000'"),
    area: str = Query(..., description="Area name (lowercase) or 'system'"),
    date: str = Query(..., description="Date in YYYYMMDD format"),
    current_user=Depends(get_current_user),
):
    """
    Returns actual data values for a single source × area × date cell,
    structured as chart groups for rendering per-category mini charts.
    """
    return es_service.get_coverage_preview(source_key=source_key, area=area, date=date)


@router.get("/calculate-times")
def get_prediction_calculate_times(
    source_key: str = Query(..., description="Prediction source key, e.g. 'prediction_mersol'"),
    area: str = Query(..., description="Area name (lowercase)"),
    date: str = Query(..., description="Date in YYYYMMDD format"),
    current_user=Depends(get_current_user),
):
    """
    Returns distinct calculate_time values for a prediction source × area × date,
    sorted descending (most recent first). Only applicable to prediction_* source keys.
    """
    times = es_service.get_prediction_calculate_times(source_key=source_key, area=area, date=date)
    return {"calculate_times": times}


@router.get("/records")
def get_coverage_records(
    source_key: str = Query(..., description="Source key, e.g. 'spot_price'"),
    area: str = Query(..., description="Area name (lowercase) or 'system'"),
    date: str = Query(..., description="Date in YYYYMMDD format"),
    slot: Optional[int] = Query(None, description="0-based slot index; omit for all slots in the day"),
    calculate_time: Optional[str] = Query(None, description="YYYY-MM-DD; filter prediction records to one calculation run"),
    page: int = Query(0, ge=0, description="0-based page number"),
    size: int = Query(20, ge=1, le=50, description="Records per page (max 50)"),
    current_user=Depends(get_current_user),
):
    """
    Returns paginated individual ES documents for a single source × area × date cell.
    For prediction sources, use calculate_time to filter to a specific forecasting run.
    """
    return es_service.get_coverage_records(
        source_key=source_key, area=area, date=date,
        slot=slot, calculate_time=calculate_time, page=page, size=size,
    )


@router.get("/detail")
def get_coverage_detail(
    source_key: str = Query(..., description="Source key, e.g. 'spot_price'"),
    area: str = Query(..., description="Area name (lowercase) or 'system'"),
    date: str = Query(..., description="Date in YYYYMMDD format"),
    current_user=Depends(get_current_user),
):
    """
    Returns per-hour document counts for a single source × area × date cell.
    Always returns 24 entries (one per hour, 0-23).
    """
    rows, interval = es_service.get_coverage_detail(source_key=source_key, area=area, date=date)
    return {
        "source_key": source_key,
        "area": area,
        "date": date,
        "interval": interval,
        "rows": rows,
    }
