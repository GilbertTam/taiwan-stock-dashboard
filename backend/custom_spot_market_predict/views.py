"""
Custom Spot Market Prediction API Views.

This module provides API endpoints for managing and retrieving electricity
price predictions from various ML models stored in Elasticsearch.

Endpoints:
    - predictions: Get price predictions for a specific model and date range
    - available-calculating-dates: Get list of available prediction calculation dates
    - specific-calculating-date-predictions: Get predictions for a specific calculation date
    - available-models: List all available prediction models
    - spot-csv-download: Download CSV with JEPX actual prices and model predictions
"""

import csv
import datetime
import logging
import traceback
from typing import Optional, List, Dict, Any

from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

from custom_spot_market_predict.serializers import (
    PredictionModelSerializer,
    CustomAreaPricePredictSerializer,
    AvailableCalculatingDateSerializer,
)
from common.es_service import ESService

logger = logging.getLogger(__name__)


class PredictionModelViewSet(viewsets.ViewSet):
    """
    ViewSet for listing prediction models.

    Provides a simple listing endpoint for all available prediction models
    stored in Elasticsearch.

    Attributes:
        permission_classes: Tuple of permission classes requiring authentication.
    """

    permission_classes = (IsAuthenticated,)

    @swagger_auto_schema(
        operation_summary="獲取所有預測模型",
        responses={200: PredictionModelSerializer(many=True)}
    )
    def list(self, request) -> Response:
        """
        List all available prediction models.

        Retrieves unique model sources from Elasticsearch predictions index.
        Supports optional name filtering.

        Args:
            request: DRF request with optional 'name' query parameter for filtering.

        Returns:
            Response containing list of prediction models with their metadata.
        """
        try:
            es_service = ESService()
            results = es_service.get_available_models()

            # Optional: Filter by name substring (case-insensitive)
            name = request.query_params.get('name')
            if name:
                results = [r for r in results if name.lower() in r['name'].lower()]

            return Response(results)
        except Exception as e:
            logger.error(f"Error listing prediction models: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CustomPredictViewSet(viewsets.ViewSet):
    """
    ViewSet for custom area price prediction API.

    Provides endpoints for retrieving electricity price predictions,
    querying available prediction dates, and downloading prediction data
    as CSV files.

    Attributes:
        permission_classes: Tuple of permission classes requiring authentication.

    Example:
        >>> # Get latest predictions for Tokyo area
        >>> GET /api/custom-predict/predictions?start_date=20250101&end_date=20250107&area_name=tokyo&model_name=ModelA
    """

    permission_classes = (IsAuthenticated,)

    def validate_date_param(self, date_str: Optional[str], param_name: str) -> datetime.date:
        """
        Validate a date parameter and convert to date object.

        Args:
            date_str: Date string in YYYYMMDD format, or None.
            param_name: Name of the parameter for error messages.

        Returns:
            datetime.date object representing the parsed date.

        Raises:
            ValueError: If date_str is None or not in valid YYYYMMDD format.
        """
        if not date_str:
            raise ValueError(f'必須提供 {param_name} 參數 (YYYYMMDD 格式)')

        try:
            return datetime.datetime.strptime(date_str, '%Y%m%d').date()
        except ValueError:
            raise ValueError(f'{param_name} 格式錯誤，應為 YYYYMMDD')

    @swagger_auto_schema(
        operation_summary="獲取自定義區域價格預測資料",
        manual_parameters=[
            openapi.Parameter('start_date', openapi.IN_QUERY, description="開始日期 (YYYYMMDD)", type=openapi.TYPE_STRING, required=True),
            openapi.Parameter('end_date', openapi.IN_QUERY, description="結束日期 (YYYYMMDD)", type=openapi.TYPE_STRING, required=True),
            openapi.Parameter('area_name', openapi.IN_QUERY, description="電力區域名稱", type=openapi.TYPE_STRING, required=False),
            openapi.Parameter('model_name', openapi.IN_QUERY, description="模型名稱", type=openapi.TYPE_STRING, required=True),
            openapi.Parameter('latest_only', openapi.IN_QUERY, description="是否只返回最新預測", type=openapi.TYPE_BOOLEAN, required=False),
        ],
        responses={200: CustomAreaPricePredictSerializer(many=True)}
    )
    @action(detail=False, methods=['get'], url_path='predictions')
    def predictions(self, request) -> Response:
        """
        Retrieve price predictions for a specific model.

        Fetches electricity price predictions from Elasticsearch for the given
        date range, area, and model. By default returns only the latest
        predictions (most recent calculating_date).

        Args:
            request: DRF request with query params:
                - start_date (str): Start date in YYYYMMDD format.
                - end_date (str): End date in YYYYMMDD format.
                - model_name (str): Name of the prediction model.
                - area_name (str, optional): Filter by area.
                - latest_only (bool, optional): If true, return only latest prediction
                  per time slot. Defaults to true.

        Returns:
            Response with prediction data including price_5, price_50, price_95.
        """
        try:
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            model_name = request.query_params.get('model_name')
            area_name = request.query_params.get('area_name')
            latest_only = request.query_params.get('latest_only', 'true').lower() == 'true'

            self.validate_date_param(start_date, 'start_date')
            self.validate_date_param(end_date, 'end_date')

            if not model_name:
                return Response(
                    {"result": [{"Message": "Error", "Detail": "必須提供 model_name"}]},
                    status=status.HTTP_400_BAD_REQUEST
                )

            es_service = ESService()
            results = es_service.get_predictions(
                start_date=start_date,
                end_date=end_date,
                area_name=area_name,
                model_name=model_name,
                latest_only=latest_only
            )

            return Response({
                "result": [{"Message": "Success"}],
                "code": 0,
                "count": len(results),
                "data": results
            })

        except ValueError as e:
            return Response({"result": [{"Message": "Error", "Detail": str(e)}], "code": 1}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error fetching predictions: {str(e)}\n{traceback.format_exc()}")
            return Response({"result": [{"Message": "Error", "Detail": str(e)}], "code": 1}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @swagger_auto_schema(
        operation_summary="獲取可用的預測計算日期列表",
        manual_parameters=[
            openapi.Parameter('start_date', openapi.IN_QUERY, description="開始日期 (YYYYMMDD)", type=openapi.TYPE_STRING, required=True),
            openapi.Parameter('end_date', openapi.IN_QUERY, description="結束日期 (YYYYMMDD)", type=openapi.TYPE_STRING, required=True),
            openapi.Parameter('area_name', openapi.IN_QUERY, description="電力區域名稱", type=openapi.TYPE_STRING, required=True),
            openapi.Parameter('model_name', openapi.IN_QUERY, description="模型名稱", type=openapi.TYPE_STRING, required=True),
        ],
        responses={200: AvailableCalculatingDateSerializer(many=True)}
    )
    @action(detail=False, methods=['get'], url_path='available-calculating-dates')
    def available_calculating_dates(self, request) -> Response:
        """
        Get list of available prediction calculation dates.

        Returns all unique calculating dates (when predictions were generated)
        for a specific model and area within the given date range. Useful for
        allowing users to compare predictions made at different times.

        Args:
            request: DRF request with query params:
                - start_date (str): Start date in YYYYMMDD format.
                - end_date (str): End date in YYYYMMDD format.
                - area_name (str): Area name filter.
                - model_name (str): Model name filter.

        Returns:
            Response with list of calculating_date values.
        """
        try:
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            area_name = request.query_params.get('area_name')
            model_name = request.query_params.get('model_name')

            self.validate_date_param(start_date, 'start_date')
            self.validate_date_param(end_date, 'end_date')

            if not area_name or not model_name:
                return Response(
                    {"result": [{"Message": "Error", "Detail": "Missing required params"}]},
                    status=status.HTTP_400_BAD_REQUEST
                )

            es_service = ESService()
            results = es_service.get_available_calculating_dates(
                start_date=start_date,
                end_date=end_date,
                area_name=area_name,
                model_name=model_name,
            )

            return Response({
                "result": [{"Message": "Success"}],
                "code": 0,
                "data": results
            })
        except ValueError as e:
            return Response({"result": [{"Message": "Error", "Detail": str(e)}], "code": 1}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error fetching calculating dates: {e}")
            return Response({"result": [{"Message": "Error", "Detail": str(e)}], "code": 1}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @swagger_auto_schema(
        operation_summary="獲取特定計算日期的預測資料",
        manual_parameters=[
            openapi.Parameter('start_date', openapi.IN_QUERY, description="開始日期 (YYYYMMDD)", type=openapi.TYPE_STRING, required=True),
            openapi.Parameter('end_date', openapi.IN_QUERY, description="結束日期 (YYYYMMDD)", type=openapi.TYPE_STRING, required=True),
            openapi.Parameter('calculating_date', openapi.IN_QUERY, description="計算日期 (YYYYMMDD)", type=openapi.TYPE_STRING, required=True),
            openapi.Parameter('model_name', openapi.IN_QUERY, description="模型名稱", type=openapi.TYPE_STRING, required=True),
            openapi.Parameter('area_name', openapi.IN_QUERY, description="電力區域名稱", type=openapi.TYPE_STRING, required=False),
        ],
        responses={200: CustomAreaPricePredictSerializer(many=True)}
    )
    @action(detail=False, methods=['get'], url_path='specific-calculating-date-predictions')
    def specific_calculating_date_predictions(self, request) -> Response:
        """
        Get predictions for a specific calculation date.

        Retrieves predictions that were calculated on a specific date,
        allowing historical comparison of prediction accuracy.

        Args:
            request: DRF request with query params:
                - start_date (str): Start date in YYYYMMDD format.
                - end_date (str): End date in YYYYMMDD format.
                - calculating_date (str): Specific calculation date filter.
                - model_name (str): Model name filter.
                - area_name (str, optional): Area name filter.

        Returns:
            Response with prediction data for the specified calculating_date.
        """
        try:
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            calculating_date = request.query_params.get('calculating_date')
            model_name = request.query_params.get('model_name')
            area_name = request.query_params.get('area_name')

            self.validate_date_param(start_date, 'start_date')
            self.validate_date_param(end_date, 'end_date')
            self.validate_date_param(calculating_date, 'calculating_date')

            if not model_name:
                return Response(
                    {"result": [{"Message": "Error", "Detail": "Missing required params"}]},
                    status=status.HTTP_400_BAD_REQUEST
                )

            es_service = ESService()
            results = es_service.get_predictions(
                start_date=start_date,
                end_date=end_date,
                area_name=area_name,
                model_name=model_name,
                calculating_date=calculating_date,
                latest_only=False  # Return all predictions for the specific calculating_date
            )

            return Response({
                "result": [{"Message": "Success"}],
                "count": len(results),
                "code": 0,
                "data": results
            })
        except ValueError as e:
            return Response({"result": [{"Message": "Error", "Detail": str(e)}], "code": 1}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error fetching specific predictions: {e}")
            return Response({"result": [{"Message": "Error", "Detail": str(e)}], "code": 1}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @swagger_auto_schema(
        operation_summary="獲取所有可用的預測模型列表",
        responses={200: PredictionModelSerializer(many=True)}
    )
    @action(detail=False, methods=['get'], url_path='available-models')
    def available_models(self, request) -> Response:
        """
        List all available prediction models.

        Returns unique model sources from the prediction index,
        providing a list of models that can be selected for predictions.

        Args:
            request: DRF request (no parameters required).

        Returns:
            Response with list of available model metadata.
        """
        try:
            es_service = ESService()
            results = es_service.get_available_models()

            return Response({
                "result": [{"Message": "Success"}],
                "code": 0,
                "data": results
            })
        except Exception as e:
            logger.error(f"Error listing available models: {e}")
            return Response({"result": [{"Message": "Error", "Detail": str(e)}], "code": 1}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @swagger_auto_schema(
        operation_summary="下載 Spot CSV（包含 JEPX 實際與各模型最新預測）",
        manual_parameters=[
            openapi.Parameter(
                "start_date",
                openapi.IN_QUERY,
                description="開始日期 (YYYYMMDD)",
                type=openapi.TYPE_STRING,
                required=True,
            ),
            openapi.Parameter(
                "end_date",
                openapi.IN_QUERY,
                description="結束日期 (YYYYMMDD)",
                type=openapi.TYPE_STRING,
                required=True,
            ),
            openapi.Parameter(
                "area_name",
                openapi.IN_QUERY,
                description="電力區域名稱 (EN，如 tokyo)",
                type=openapi.TYPE_STRING,
                required=True,
            ),
            openapi.Parameter(
                "model_names",
                openapi.IN_QUERY,
                description="模型名稱列表，逗號分隔；若省略則只輸出 JEPX 實際價格",
                type=openapi.TYPE_STRING,
                required=False,
            ),
        ],
        responses={200: "text/csv"},
    )
    @action(detail=False, methods=["get"], url_path="spot-csv-download")
    def spot_csv_download(self, request) -> HttpResponse:
        """
        Download CSV with JEPX actual prices and model predictions.

        Generates a CSV file containing:
        - JEPX actual prices (always included as base data)
        - Predicted prices (price_50) for each specified model

        The CSV uses JEPX trades as the base rows, with model predictions
        joined by (trade_date, time_code) key.

        Args:
            request: DRF request with query params:
                - start_date (str): Start date in YYYYMMDD format.
                - end_date (str): End date in YYYYMMDD format.
                - area_name (str): Area name in English (e.g., 'tokyo').
                - model_names (str, optional): Comma-separated list of model names.

        Returns:
            HttpResponse with CSV attachment containing price data.

        Example CSV output:
            trade_date,time_code,area_name,jepx_price,ModelA_predicted_price,ModelB_predicted_price
            2025-01-01,1,tokyo,15.5,14.8,15.2
            2025-01-01,2,tokyo,16.0,15.5,15.8
        """
        try:
            start_date = request.query_params.get("start_date")
            end_date = request.query_params.get("end_date")
            area_name = request.query_params.get("area_name")
            model_names_param = request.query_params.get("model_names", "")

            self.validate_date_param(start_date, "start_date")
            self.validate_date_param(end_date, "end_date")

            if not area_name:
                return Response(
                    {
                        "result": [
                            {
                                "Message": "Error",
                                "Detail": "必須提供 area_name 參數",
                            }
                        ],
                        "code": 1,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Parse model names from comma-separated string, removing duplicates
            # while preserving order
            raw_model_names = [
                m.strip()
                for m in model_names_param.split(",")
                if m and m.strip()
            ]
            model_names: List[str] = list(dict.fromkeys(raw_model_names))

            es_service = ESService()

            # Step 1: Fetch JEPX actual prices as base data
            # These form the foundation rows of the CSV
            jepx_trades = es_service.get_jepx_trades(
                start_date=start_date,
                end_date=end_date,
                area_name=area_name,
            )

            # Build base rows from JEPX trades
            # Each row keyed by (trade_date, time_code) for later joining
            base_rows: List[Dict[str, Any]] = []
            for trade in jepx_trades:
                base_rows.append(
                    {
                        "trade_date": str(trade.get("trade_date")),
                        "time_code": int(trade.get("time_code")),
                        "area_name": trade.get("name"),
                        "jepx_price": trade.get("price"),
                    }
                )

            # Step 2: Fetch predictions for each model and index by (date, time_code)
            # This allows O(1) lookup when building CSV rows
            predictions_index: Dict[tuple, float] = {}
            for model_name in model_names:
                try:
                    predictions = es_service.get_predictions(
                        start_date=start_date,
                        end_date=end_date,
                        area_name=area_name,
                        model_name=model_name,
                        latest_only=True,  # Only include most recent predictions
                    )
                    for p in predictions:
                        key = (
                            str(p.get("trade_date")),
                            int(p.get("time_code")),
                            model_name,
                        )
                        predictions_index[key] = p.get("price_50")
                except Exception as e:
                    # Log error but continue with other models
                    # Partial data is better than complete failure
                    logger.error(
                        f"Error fetching predictions for model {model_name}: {e}"
                    )
                    continue

            # Step 3: Generate CSV response
            filename = f"spot_{area_name}_{start_date}_{end_date}.csv"
            response = HttpResponse(content_type="text/csv")
            response["Content-Disposition"] = f'attachment; filename="{filename}"'

            writer = csv.writer(response)

            # Write header: base columns + one column per model
            header = ["trade_date", "time_code", "area_name", "jepx_price"]
            for model_name in model_names:
                header.append(f"{model_name}_predicted_price")
            writer.writerow(header)

            # Write data rows
            for row in base_rows:
                row_values = [
                    row["trade_date"],
                    row["time_code"],
                    row["area_name"],
                    row["jepx_price"],
                ]
                # Append prediction values for each model, empty string if not found
                for model_name in model_names:
                    key = (
                        row["trade_date"],
                        row["time_code"],
                        model_name,
                    )
                    price_50 = predictions_index.get(key)
                    row_values.append(price_50 if price_50 is not None else "")
                writer.writerow(row_values)

            return response

        except ValueError as e:
            return Response(
                {
                    "result": [
                        {"Message": "Error", "Detail": str(e)},
                    ],
                    "code": 1,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error(
                f"Error generating spot CSV: {str(e)}\n{traceback.format_exc()}"
            )
            return Response(
                {
                    "result": [
                        {"Message": "Error", "Detail": str(e)},
                    ],
                    "code": 1,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
