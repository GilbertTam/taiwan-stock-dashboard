import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from app.services.optimization import optimize_battery
from app.services.manual_simulation import simulate_battery_manual
from app.schemas.revenue import OptimizationRequest, OptimizationResponse, ManualSimulationRequest
from app.api.v1.auth import get_current_user
from app.core.logging import logger
import math
import numpy as np

router = APIRouter()

def sanitize_for_json(obj):
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return 0.0
        return obj
    elif isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(v) for v in obj]
    elif isinstance(obj, (np.integer, np.floating)):
        return sanitize_for_json(float(obj))
    elif isinstance(obj, np.ndarray):
        return sanitize_for_json(obj.tolist())
    return obj

@router.post("", response_model=OptimizationResponse)
def optimize_revenue(
    request: OptimizationRequest,
    current_user = Depends(get_current_user)
):
    try:
        config = request.config.model_dump()
        data = [row.model_dump() for row in request.data]
        
        df = pd.DataFrame(data)
        
        # Validation
        if len(df) != config.get('T', 48):
            config['T'] = len(df)
            
        result_df = optimize_battery(df, config)
        
        results = result_df.to_dict(orient='records')
        total_revenue = result_df['revenue'].sum() if 'revenue' in result_df.columns else 0
        
        response_data = {
            "status": "success",
            "summary": {
                "total_revenue": total_revenue
            },
            "results": results
        }
        
        return sanitize_for_json(response_data)
        
    except Exception as e:
        logger.error(f"Optimization failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Optimization failed. Check server logs for details.")


@router.post("/manual", response_model=OptimizationResponse)
def simulate_manual_revenue(
    request: ManualSimulationRequest,
    current_user = Depends(get_current_user)
):
    try:
        config = request.config.model_dump()
        data = [row.model_dump() for row in request.data]
        schedule = [entry.model_dump() for entry in request.schedule]

        df = pd.DataFrame(data)
        config['T'] = len(df)

        result_df = simulate_battery_manual(df, schedule, config)

        results = result_df.to_dict(orient='records')
        total_revenue = result_df['revenue'].sum() if 'revenue' in result_df.columns else 0

        response_data = {
            "status": "success",
            "summary": {"total_revenue": total_revenue},
            "results": results
        }

        return sanitize_for_json(response_data)

    except Exception as e:
        logger.error(f"Manual simulation failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Manual simulation failed. Check server logs for details.")
