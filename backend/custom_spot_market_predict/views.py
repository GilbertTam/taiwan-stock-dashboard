from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
import datetime
import logging
import csv

from django.http import HttpResponse

from custom_spot_market_predict.serializers import (
    PredictionModelSerializer,
    CustomAreaPricePredictSerializer,
    AvailableCalculatingDateSerializer,
)
from common.es_service import ESService

logger = logging.getLogger(__name__)

class PredictionModelViewSet(viewsets.ViewSet):
    """
    預測模型 API
    """
    permission_classes = (IsAuthenticated,)
    
    @swagger_auto_schema(
        operation_summary="獲取所有預測模型",
        responses={200: PredictionModelSerializer(many=True)}
    )
    def list(self, request):
        try:
            es_service = ESService()
            results = es_service.get_available_models()
            
            # Simple filtering by name if needed
            name = request.query_params.get('name')
            if name:
                results = [r for r in results if name.lower() in r['name'].lower()]
                
            return Response(results)
        except Exception as e:
            logger.error(f"Error listing prediction models: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CustomPredictViewSet(viewsets.ViewSet):
    """
    自定義區域價格預測 API
    """
    permission_classes = (IsAuthenticated,)
    
    def validate_date_param(self, date_str, param_name):
        """驗證日期參數"""
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
    def predictions(self, request):
        try:
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            model_name = request.query_params.get('model_name')
            area_name = request.query_params.get('area_name')
            latest_only = request.query_params.get('latest_only', 'true').lower() == 'true'

            self.validate_date_param(start_date, 'start_date')
            self.validate_date_param(end_date, 'end_date')

            if not model_name:
                 return Response({"result": [{"Message": "Error", "Detail": "必須提供 model_name"}]}, status=status.HTTP_400_BAD_REQUEST)

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
            import traceback
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
    def available_calculating_dates(self, request):
        try:
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            area_name = request.query_params.get('area_name')
            model_name = request.query_params.get('model_name')

            self.validate_date_param(start_date, 'start_date')
            self.validate_date_param(end_date, 'end_date')

            if not area_name or not model_name:
                return Response({"result": [{"Message": "Error", "Detail": "Missing required params"}]}, status=status.HTTP_400_BAD_REQUEST)

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
    def specific_calculating_date_predictions(self, request):
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
                return Response({"result": [{"Message": "Error", "Detail": "Missing required params"}]}, status=status.HTTP_400_BAD_REQUEST)

            es_service = ESService()
            results = es_service.get_predictions(
                start_date=start_date,
                end_date=end_date,
                area_name=area_name,
                model_name=model_name,
                calculating_date=calculating_date,
                latest_only=False
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
    def available_models(self, request):
        try:
            es_service = ESService()
            results = es_service.get_available_models()
            
            # Since PredictionModelViewSet is now separate or unused for ES listing in some contexts,
            # we ensure this endpoint returns the list directly or wrapped as expected.
            # The structure matches what the frontend likely expects based on the previous implementation:
            # { "result": [...], "code": 0, "data": [...] }
            
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
    def spot_csv_download(self, request):
        """
        根據日期區間、區域與可選模型清單下載 CSV。
        - 任何情況都會包含 JEPX 實際價格
        - 若提供模型名稱，則對每個模型拉取 latest 預測 (price_50)
        """
        try:
            start_date = request.query_params.get("start_date")
            end_date = request.query_params.get("end_date")
            area_name = request.query_params.get("area_name")
            model_names_param = request.query_params.get("model_names", "")

            # 驗證日期
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

            # 處理模型名稱清單（可為空）
            raw_model_names = [
                m.strip()
                for m in model_names_param.split(",")
                if m and m.strip()
            ]
            model_names = list(dict.fromkeys(raw_model_names))  # 去重並保留順序

            es_service = ESService()

            # 取得 JEPX 實際資料（必定存在且作為基準列）
            jepx_trades = es_service.get_jepx_trades(
                start_date=start_date,
                end_date=end_date,
                area_name=area_name,
            )

            # 建立 (trade_date, time_code) 為 key 的基準列
            # jepx_trades 已在 ESService 中依 trade_date, time_code 排序
            base_rows = []
            for trade in jepx_trades:
                base_rows.append(
                    {
                        "trade_date": str(trade.get("trade_date")),
                        "time_code": int(trade.get("time_code")),
                        "area_name": trade.get("name"),
                        "jepx_price": trade.get("price"),
                    }
                )

            # 取得各模型最新預測 (price_50)
            predictions_index = {}
            for model_name in model_names:
                try:
                    predictions = es_service.get_predictions(
                        start_date=start_date,
                        end_date=end_date,
                        area_name=area_name,
                        model_name=model_name,
                        latest_only=True,
                    )
                    for p in predictions:
                        key = (
                            str(p.get("trade_date")),
                            int(p.get("time_code")),
                            model_name,
                        )
                        predictions_index[key] = p.get("price_50")
                except Exception as e:
                    # 若單一模型失敗，記 log，但整體不因此中斷
                    logger.error(
                        f"Error fetching predictions for model {model_name}: {e}"
                    )
                    continue

            # 準備 CSV 回應
            filename = f"spot_{area_name}_{start_date}_{end_date}.csv"
            response = HttpResponse(content_type="text/csv")
            response[
                "Content-Disposition"
            ] = f'attachment; filename="{filename}"'

            writer = csv.writer(response)

            # 標題列：基礎欄位 + 每個模型一欄
            header = ["trade_date", "time_code", "area_name", "jepx_price"]
            for model_name in model_names:
                header.append(f"{model_name}_predicted_price")
            writer.writerow(header)

            # 寫入資料列
            for row in base_rows:
                row_values = [
                    row["trade_date"],
                    row["time_code"],
                    row["area_name"],
                    row["jepx_price"],
                ]
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
            import traceback

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
