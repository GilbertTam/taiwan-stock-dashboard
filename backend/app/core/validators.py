from datetime import datetime
from fastapi import HTTPException


def validate_dates(start_date: str, end_date: str) -> None:
    """Validate that start_date and end_date are present and in YYYYMMDD format."""
    if not start_date or not end_date:
        raise HTTPException(status_code=400, detail="start_date and end_date are required")
    if len(start_date) != 8 or len(end_date) != 8:
        raise HTTPException(status_code=400, detail="Dates must be in YYYYMMDD format")
    try:
        datetime.strptime(start_date, "%Y%m%d")
        datetime.strptime(end_date, "%Y%m%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date. Use YYYYMMDD format with valid values.")
