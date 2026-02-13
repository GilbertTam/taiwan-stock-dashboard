from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import pandas as pd
import logging
from .services.optimization import optimize_battery

logger = logging.getLogger(__name__)

import math
import numpy as np

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

class RevenueOptimizationView(APIView):
    """
    API View to perform battery revenue optimization.
    """
    def post(self, request):
        try:
            data = request.data
            
            # 1. Parse Configuration
            config = data.get('config', {})
            
            # ... (validation skipped for brevity, trust existing logic or add if needed)

            # 2. Parse Price Data
            price_data = data.get('data', [])
            if not price_data:
                return Response({"error": "No price data provided"}, status=status.HTTP_400_BAD_REQUEST)
            
            df = pd.DataFrame(price_data)
            
            # Ensure required columns exist
            required_columns = ['Spot_Price']
            for col in required_columns:
                if col not in df.columns:
                    return Response({"error": f"Missing column: {col}"}, status=status.HTTP_400_BAD_REQUEST)

            # Optional columns defaults
            if 'Bal_Price' not in df.columns:
                df['Bal_Price'] = 0
            if 'Mask_Ch' not in df.columns:
                df['Mask_Ch'] = 1
            if 'Mask_Dis' not in df.columns:
                df['Mask_Dis'] = 1
                
            # 3. Run Optimization
            # Ensure T matches data length if not strictly enforced
            if len(df) != config.get('T', 48):
                config['T'] = len(df)
            
            result_df = optimize_battery(df, config)
            
            # 4. Format Results
            results = result_df.to_dict(orient='records')
            
            # Calculate summary metrics
            total_revenue = result_df['revenue'].sum() if 'revenue' in result_df.columns else 0
            
            response_data = {
                "status": "success",
                "summary": {
                    "total_revenue": total_revenue
                },
                "results": results
            }
            
            # Sanitize entire response to remove NaN/Inf
            safe_response = sanitize_for_json(response_data)
            
            return Response(safe_response)
            
        except Exception as e:
            logger.error(f"Optimization failed: {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
