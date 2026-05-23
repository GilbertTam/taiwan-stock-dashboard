from io import StringIO
from typing import List, Optional

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from starlette.responses import StreamingResponse

from app.services.es_service import es_service
from app.schemas.prediction import PredictionResponse, CalculatingDate, AvailableModel
from app.api.v1.auth import get_current_user
from app.core.validators import validate_dates

router = APIRouter()

@router.get("/predictions", response_model=PredictionResponse)
def get_predictions(
    start_date: str,
    end_date: str,
    model_name: str,
    area_name: Optional[str] = None,
    latest_only: bool = True,
    current_user = Depends(get_current_user)
):
    validate_dates(start_date, end_date)
    es = es_service
    data = es.get_predictions(
        start_date=start_date,
        end_date=end_date,
        area_name=area_name,
        model_name=model_name,
        latest_only=latest_only
    )
    return {
        "result": "Success",
        "code": 0,
        "count": len(data),
        "data": data
    }

@router.get("/specific-calculating-date-predictions", response_model=PredictionResponse)
def get_specific_calculating_date_predictions(
    start_date: str,
    end_date: str,
    model_name: str,
    calculating_date: str,
    area_name: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    validate_dates(start_date, end_date)
    es = es_service
    data = es.get_predictions(
        start_date=start_date,
        end_date=end_date,
        area_name=area_name,
        model_name=model_name,
        calculating_date=calculating_date,
        latest_only=False
    )
    return {
        "result": "Success",
        "code": 0,
        "count": len(data),
        "data": data
    }

@router.get("/available-dates", response_model=List[CalculatingDate])
def get_available_dates(
    start_date: str,
    end_date: str,
    area_name: str,
    model_name: str,
    current_user = Depends(get_current_user)
):
    validate_dates(start_date, end_date)
    es = es_service
    data = es.get_available_calculating_dates(start_date, end_date, area_name, model_name)
    return data

@router.get("/available-models", response_model=List[AvailableModel])
def get_available_models(
    current_user = Depends(get_current_user)
):
    es = es_service
    data = es.get_available_models()
    return data
@router.get("/spot-csv-download")
def download_spot_csv(
    start_date: str,
    end_date: str,
    area_name: str,
    model_names: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    validate_dates(start_date, end_date)
    es = es_service
    
    # 1. Get Actual Spot Prices
    actual_data = es.get_jepx_trades(start_date, end_date, area_name)
    
    # 2. Get Predictions for all models in a single query
    predictions_map: dict = {}
    if model_names:
        model_list = [m.strip() for m in model_names.split(',') if m.strip()]
        if model_list:
            all_preds = es.get_predictions(
                start_date=start_date,
                end_date=end_date,
                area_name=area_name,
                model_name=None,
                latest_only=True,
                model_names=model_list
            )
            for pred in all_preds:
                mn = pred['model_name']
                predictions_map.setdefault(mn, []).append(pred)

    processed_data: dict = {}  # key: f"{date}_{time_code}"
    
    for item in actual_data:
        key = f"{item['trade_date']}_{item['time_code']}"
        processed_data[key] = {
            "Date": item['trade_date'],
            "TimeCode": item['time_code'],
            "Area": item['name'],
            "ActualPrice": item['price']
        }
        
    # Process predictions
    for model_name, preds in predictions_map.items():
        for item in preds:
            key = f"{item['trade_date']}_{item['time_code']}"
            if key not in processed_data:
                 # If prediction exists but no actual (e.g. future), create entry
                processed_data[key] = {
                    "Date": item['trade_date'],
                    "TimeCode": item['time_code'],
                    "Area": item['area_name'],
                    "ActualPrice": None
                }
            
            processed_data[key][f"Pred_{model_name}"] = item['price_50']
            
    # Convert to list and sort
    final_rows = list(processed_data.values())
    final_rows.sort(key=lambda x: (x['Date'], x['TimeCode']))
    
    df = pd.DataFrame(final_rows)
    
    # Reorder columns: Date, TimeCode, Area, ActualPrice, [Pred_Model1, Pred_Model2...]
    cols = ['Date', 'TimeCode', 'Area', 'ActualPrice']
    if model_names:
         for model in model_names.split(','):
            model = model.strip()
            if not model: continue
            col_name = f"Pred_{model}"
            if col_name in df.columns:
                cols.append(col_name)
                
    # Ensure columns exist (handle empty data case)
    existing_cols = [c for c in cols if c in df.columns]
    df = df[existing_cols] if not df.empty else pd.DataFrame(columns=cols)

    stream = StringIO()
    df.to_csv(stream, index=False)
    response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=spot_{area_name}_{start_date}_{end_date}.csv"
    return response
