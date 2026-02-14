from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from app.services.es_service import ESService
from app.schemas.prediction import PredictionResponse, CalculatingDate, AvailableModel
from app.api.v1.auth import get_current_user

router = APIRouter()

def validate_dates(start_date: str, end_date: str):
    if not start_date or not end_date:
        raise HTTPException(status_code=400, detail="start_date and end_date are required")
    if len(start_date) != 8 or len(end_date) != 8:
        raise HTTPException(status_code=400, detail="Dates must be in YYYYMMDD format")

@router.get("/predictions", response_model=PredictionResponse)
async def get_predictions(
    start_date: str,
    end_date: str,
    model_name: str,
    area_name: Optional[str] = None,
    latest_only: bool = True,
    current_user = Depends(get_current_user)
):
    validate_dates(start_date, end_date)
    es = ESService()
    data = es.get_predictions(
        start_date=start_date,
        end_date=end_date,
        area_name=area_name,
        model_name=model_name,
        latest_only=latest_only
    )
    return {
        "result": [{"Message": "Success"}],
        "code": 0,
        "count": len(data),
        "data": data
    }

@router.get("/available-dates", response_model=List[CalculatingDate])
async def get_available_dates(
    start_date: str,
    end_date: str,
    area_name: str,
    model_name: str,
    current_user = Depends(get_current_user)
):
    validate_dates(start_date, end_date)
    es = ESService()
    data = es.get_available_calculating_dates(start_date, end_date, area_name, model_name)
    return data

@router.get("/available-models", response_model=List[AvailableModel])
async def get_available_models(
    current_user = Depends(get_current_user)
):
    es = ESService()
    data = es.get_available_models()
    return data
@router.get("/spot-csv-download")
async def download_spot_csv(
    start_date: str,
    end_date: str,
    area_name: str,
    model_names: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    validate_dates(start_date, end_date)
    es = ESService()
    
    # 1. Get Actual Spot Prices
    actual_data = es.get_jepx_trades(start_date, end_date, area_name)
    
    # 2. Get Predictions for each model
    predictions_map = {}
    if model_names:
        for model in model_names.split(','):
            model = model.strip()
            if not model:
                continue
            preds = es.get_predictions(
                start_date=start_date,
                end_date=end_date,
                area_name=area_name,
                model_name=model,
                latest_only=True
            )
            predictions_map[model] = preds

    import pandas as pd
    from io import  StringIO
    from starlette.responses import StreamingResponse

    # Prepare data for DataFrame
    # Base: all 30-min slots in range. 
    # Actually, let's just use the actual data as base since it has all time slots.
    
    rows = []
    # Create a map for quick lookup: (trade_date, time_code) -> data
    
    # Process actual data
    processed_data = {} # key: f"{date}_{time_code}"
    
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
