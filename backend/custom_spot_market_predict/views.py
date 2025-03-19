from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db import connection, transaction
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
import datetime
from django.db.models import Q

from custom_spot_market_predict.models import PredictionModel, CustomAreaPricePredict
from custom_spot_market_predict.serializers import (
    PredictionModelSerializer, 
    CustomAreaPricePredictSerializer,
    CustomAreaPricePredictBulkCreateSerializer
)

import logging
logger = logging.getLogger(__name__)

class PredictionModelViewSet(viewsets.ModelViewSet):
    """
    預測模型 API
    """
    queryset = PredictionModel.objects.all()
    serializer_class = PredictionModelSerializer
    permission_classes = (IsAuthenticated,)
    
    def get_queryset(self):
        queryset = PredictionModel.objects.all()
        name = self.request.query_params.get('name')
        if name:
            queryset = queryset.filter(name__icontains=name)
        return queryset

class CustomPredictViewSet(viewsets.ViewSet):
    """
    自定義區域價格預測 API
    """
    permission_classes = (IsAuthenticated,)
    
    @swagger_auto_schema(
        operation_summary="獲取自定義區域價格預測資料",
        operation_description="根據日期範圍、區域和模型獲取自定義區域價格預測資料",
        manual_parameters=[
            openapi.Parameter(
                'start_date', 
                openapi.IN_QUERY, 
                description="開始日期 (YYYYMMDD)", 
                type=openapi.TYPE_STRING,
                required=True
            ),
            openapi.Parameter(
                'end_date', 
                openapi.IN_QUERY, 
                description="結束日期 (YYYYMMDD)", 
                type=openapi.TYPE_STRING,
                required=True
            ),
            openapi.Parameter(
                'area_name', 
                openapi.IN_QUERY, 
                description="電力區域名稱 (選填，如不提供則返回所有區域預測)", 
                type=openapi.TYPE_STRING,
                required=False
            ),
            openapi.Parameter(
                'model_name', 
                openapi.IN_QUERY, 
                description="模型名稱", 
                type=openapi.TYPE_STRING,
                required=True
            ),
            openapi.Parameter(
                'model_version', 
                openapi.IN_QUERY, 
                description="模型版本", 
                type=openapi.TYPE_STRING,
                required=True
            ),
            openapi.Parameter(
                'latest_only', 
                openapi.IN_QUERY, 
                description="是否只返回最新預測 (預設為true)，選擇false則返回該模型所有時間的預測", 
                type=openapi.TYPE_BOOLEAN,
                required=False
            ),
        ],
        responses={
            "200": openapi.Response(
                description="成功獲取資料",
                examples={
                    "application/json": {
                        "result": [{"Message": "Success"}],
                        "code": 0,
                        "data": [
                            {
                                "id": 1,
                                "model_name": "MyModel",
                                "model_version": "1.0.0",
                                "trade_date": "2025-01-01",
                                "time_code": 1,
                                "calculating_date": "2024-12-31",
                                "area_name": "東京",
                                "area_name_ch": "東京",
                                "area_name_jp": "東京",
                                "price_5": "8.50",
                                "price_50": "10.50",
                                "price_95": "12.50",
                                "additional_data": {"confidence": 0.95}
                            }
                        ]
                    }
                },
            ),
            "400": openapi.Response(
                description="參數錯誤",
                examples={
                    "application/json": {
                        "result": [{"Message": "Error", "Detail": "日期格式錯誤，應為 YYYYMMDD"}],
                        "code": 1,
                    }
                },
            )
        },
    )
    @action(detail=False, methods=['get'], url_path='predictions')
    def predictions(self, request):
        """獲取自定義區域價格預測資料"""
        try:
            # 獲取並驗證日期參數
            start_date = self.validate_date_param(
                request.query_params.get('start_date'),
                'start_date'
            )
            end_date = self.validate_date_param(
                request.query_params.get('end_date'),
                'end_date'
            )
            
            # 必須提供模型名稱和版本
            model_name = request.query_params.get('model_name')
            model_version = request.query_params.get('model_version')
            if not model_name or not model_version:
                return Response(
                    {
                        "result": [{"Message": "Error", "Detail": "必須提供 model_name 和 model_version 參數"}],
                        "code": 1,
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 可選參數
            area_name = request.query_params.get('area_name')
            latest_only = request.query_params.get('latest_only', 'true').lower() == 'true'
            
            # 構建 SQL 查詢
            if latest_only:
                # 使用窗口函數獲取最新預測
                sql_query = """
                    WITH latest_predictions AS (
                        SELECT 
                            cap.id,
                            pm.name as model_name,
                            pm.version as model_version,
                            cap.trade_date,
                            cap.time_code,
                            cap.calculating_date,
                            cap.price_5,
                            cap.price_50,
                            cap.price_95,
                            cap.additional_data,
                            a.id as area_id,
                            a.name as area_name,
                            a.name_ch as area_name_ch,
                            a.name_jp as area_name_jp,
                            ROW_NUMBER() OVER(
                                PARTITION BY cap.trade_date, cap.time_code, cap.area_id
                                ORDER BY cap.calculating_date DESC
                            ) as rn
                        FROM custom_area_price_predict cap
                        JOIN prediction_model pm ON cap.model_id = pm.id
                        JOIN area a ON cap.area_id = a.id
                        WHERE 
                            cap.trade_date BETWEEN %s AND %s
                            AND pm.name = %s
                            AND pm.version = %s
                            {area_filter}
                    )
                    SELECT 
                        id,
                        model_name,
                        model_version,
                        trade_date,
                        time_code,
                        calculating_date,
                        price_5,
                        price_50,
                        price_95,
                        additional_data,
                        area_id,
                        area_name,
                        area_name_ch,
                        area_name_jp
                    FROM latest_predictions
                    WHERE rn = 1
                    ORDER BY trade_date, time_code, area_name
                """
            else:
                # 獲取所有預測
                sql_query = """
                    SELECT 
                        cap.id,
                        pm.name as model_name,
                        pm.version as model_version,
                        cap.trade_date,
                        cap.time_code,
                        cap.calculating_date,
                        cap.price_5,
                        cap.price_50,
                        cap.price_95,
                        cap.additional_data,
                        a.id as area_id,
                        a.name as area_name,
                        a.name_ch as area_name_ch,
                        a.name_jp as area_name_jp
                    FROM custom_area_price_predict cap
                    JOIN prediction_model pm ON cap.model_id = pm.id
                    JOIN area a ON cap.area_id = a.id
                    WHERE 
                        cap.trade_date BETWEEN %s AND %s
                        AND pm.name = %s
                        AND pm.version = %s
                        {area_filter}
                    ORDER BY cap.trade_date, cap.time_code, a.name, cap.calculating_date DESC
                """
            
            # 添加區域過濾條件
            area_filter = ""
            params = [start_date, end_date, model_name, model_version]
            if area_name:
                area_filter = "AND a.name = %s"
                params.append(area_name)
            
            # 格式化 SQL 查詢
            sql_query = sql_query.format(area_filter=area_filter)
            
            # 執行原生 SQL 查詢
            with connection.cursor() as cursor:
                cursor.execute(sql_query, params)
                
                # 獲取列名
                columns = [col[0] for col in cursor.description]
                
                # 獲取結果
                results = []
                for row in cursor.fetchall():
                    # 將查詢結果轉換為字典
                    result_dict = dict(zip(columns, row))
                    results.append(result_dict)
            
            # 本次查詢資訊
            logger.debug(f"==== 查詢自定義區域價格預測資料 ====")
            logger.debug(f"查詢日期範圍：{start_date} 到 {end_date}")
            logger.debug(f"查詢電力區域：{area_name if area_name else '所有區域'}")
            logger.debug(f"查詢模型：{model_name} {model_version}")
            logger.debug(f"是否只返回最新預測：{latest_only}")
            logger.debug(f"查詢結果數量：{len(results)}")
            logger.debug(f"=========================")

            return Response({
                "result": [{"Message": "Success"}],
                "code": 0,
                "count": len(results),
                "data": results
            })
            
        except ValueError as e:
            return Response(
                {
                    "result": [{"Message": "Error", "Detail": str(e)}],
                    "count": 0,
                    "code": 1,
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            import traceback
            logger.error(f"查詢自定義區域價格預測資料錯誤：{str(e)}\n{traceback.format_exc()}")
            return Response(
                {
                    "result": [{"Message": "Error", "Detail": str(e)}],
                    "count": 0,
                    "code": 1,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @swagger_auto_schema(
        operation_summary="獲取可用的預測計算日期列表",
        operation_description="獲取指定日期範圍、區域和模型的可用預測計算日期列表",
        manual_parameters=[
            openapi.Parameter(
                'start_date', 
                openapi.IN_QUERY, 
                description="開始日期 (YYYYMMDD)", 
                type=openapi.TYPE_STRING,
                required=True
            ),
            openapi.Parameter(
                'end_date', 
                openapi.IN_QUERY, 
                description="結束日期 (YYYYMMDD)", 
                type=openapi.TYPE_STRING,
                required=True
            ),
            openapi.Parameter(
                'area_name', 
                openapi.IN_QUERY, 
                description="電力區域名稱", 
                type=openapi.TYPE_STRING,
                required=True
            ),
            openapi.Parameter(
                'model_name', 
                openapi.IN_QUERY, 
                description="模型名稱", 
                type=openapi.TYPE_STRING,
                required=True
            ),
            openapi.Parameter(
                'model_version', 
                openapi.IN_QUERY, 
                description="模型版本", 
                type=openapi.TYPE_STRING,
                required=True
            ),
        ],
        responses={
            "200": openapi.Response(
                description="成功獲取資料",
                examples={
                    "application/json": {
                        "result": [{"Message": "Success"}],
                        "code": 0,
                        "data": [
                            {"calculating_date": "2024-12-30"},
                            {"calculating_date": "2024-12-31"}
                        ]
                    }
                },
            ),
            "400": openapi.Response(
                description="參數錯誤",
                examples={
                    "application/json": {
                        "result": [{"Message": "Error", "Detail": "日期格式錯誤，應為 YYYYMMDD"}],
                        "code": 1,
                    }
                },
            )
        },
    )
    @action(detail=False, methods=['get'], url_path='available-calculating-dates')
    def available_calculating_dates(self, request):
        """獲取可用的預測計算日期列表"""
        try:
            # 獲取並驗證日期參數
            start_date = self.validate_date_param(
                request.query_params.get('start_date'),
                'start_date'
            )
            end_date = self.validate_date_param(
                request.query_params.get('end_date'),
                'end_date'
            )
            
            # 必須提供區域名稱、模型名稱和版本
            area_name = request.query_params.get('area_name')
            model_name = request.query_params.get('model_name')
            model_version = request.query_params.get('model_version')
            
            if not area_name:
                return Response(
                    {
                        "result": [{"Message": "Error", "Detail": "必須提供 area_name 參數"}],
                        "code": 1,
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            if not model_name or not model_version:
                return Response(
                    {
                        "result": [{"Message": "Error", "Detail": "必須提供 model_name 和 model_version 參數"}],
                        "code": 1,
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 構建 SQL 查詢
            sql_query = """
                SELECT DISTINCT
                    cap.calculating_date
                FROM custom_area_price_predict cap
                JOIN prediction_model pm ON cap.model_id = pm.id
                JOIN area a ON cap.area_id = a.id
                WHERE 
                    cap.trade_date BETWEEN %s AND %s
                    AND a.name = %s
                    AND pm.name = %s
                    AND pm.version = %s
                ORDER BY cap.calculating_date DESC
            """
            
            # 執行查詢
            with connection.cursor() as cursor:
                cursor.execute(sql_query, [start_date, end_date, area_name, model_name, model_version])
                results = [{"calculating_date": row[0]} for row in cursor.fetchall()]
            
            # 本次查詢資訊
            logger.debug(f"==== 查詢可用的預測計算日期列表 ====")
            logger.debug(f"查詢日期範圍：{start_date} 到 {end_date}")
            logger.debug(f"查詢電力區域：{area_name}")
            logger.debug(f"查詢模型：{model_name} v{model_version}")
            logger.debug(f"查詢結果數量：{len(results)}")
            logger.debug(f"=========================")

            return Response({
                "result": [{"Message": "Success"}],
                "code": 0,
                "data": results
            })
            
        except ValueError as e:
            return Response(
                {
                    "result": [{"Message": "Error", "Detail": str(e)}],
                    "code": 1,
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            import traceback
            logger.error(f"查詢可用的預測計算日期列表錯誤：{str(e)}\n{traceback.format_exc()}")
            return Response(
                {
                    "result": [{"Message": "Error", "Detail": str(e)}],
                    "code": 1,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


    @swagger_auto_schema(
        operation_summary="獲取特定計算日期的預測資料",
        operation_description="根據指定的計算日期獲取自定義區域價格預測資料",
        manual_parameters=[
            openapi.Parameter(
                'start_date', 
                openapi.IN_QUERY, 
                description="開始日期 (YYYYMMDD)", 
                type=openapi.TYPE_STRING,
                required=True
            ),
            openapi.Parameter(
                'end_date', 
                openapi.IN_QUERY, 
                description="結束日期 (YYYYMMDD)", 
                type=openapi.TYPE_STRING,
                required=True
            ),
            openapi.Parameter(
                'area_name', 
                openapi.IN_QUERY, 
                description="電力區域名稱 (選填，如不提供則返回所有區域預測)", 
                type=openapi.TYPE_STRING,
                required=False
            ),
            openapi.Parameter(
                'model_name', 
                openapi.IN_QUERY, 
                description="模型名稱", 
                type=openapi.TYPE_STRING,
                required=True
            ),
            openapi.Parameter(
                'model_version', 
                openapi.IN_QUERY, 
                description="模型版本", 
                type=openapi.TYPE_STRING,
                required=True
            ),
            openapi.Parameter(
                'calculating_date', 
                openapi.IN_QUERY, 
                description="特定計算日期 (YYYYMMDD)", 
                type=openapi.TYPE_STRING,
                required=True
            ),
        ],
        responses={
            "200": openapi.Response(
                description="成功獲取資料",
                examples={
                    "application/json": {
                        "result": [{"Message": "Success"}],
                        "code": 0,
                        "data": [
                            {
                                "id": 1,
                                "model_name": "MyModel",
                                "model_version": "1.0.0",
                                "trade_date": "2025-01-01",
                                "time_code": 1,
                                "calculating_date": "2024-12-31",
                                "area_name": "東京",
                                "area_name_ch": "東京",
                                "area_name_jp": "東京",
                                "price_5": "8.50",
                                "price_50": "10.50",
                                "price_95": "12.50",
                                "additional_data": {"confidence": 0.95}
                            }
                        ]
                    }
                },
            ),
            "400": openapi.Response(
                description="參數錯誤",
                examples={
                    "application/json": {
                        "result": [{"Message": "Error", "Detail": "日期格式錯誤，應為 YYYYMMDD"}],
                        "code": 1,
                    }
                },
            )
        },
    )
    @action(detail=False, methods=['get'], url_path='specific-calculating-date-predictions')
    def specific_calculating_date_predictions(self, request):
        """獲取特定計算日期的預測資料"""
        try:
            # 獲取並驗證日期參數
            start_date = self.validate_date_param(
                request.query_params.get('start_date'),
                'start_date'
            )
            end_date = self.validate_date_param(
                request.query_params.get('end_date'),
                'end_date'
            )
            calculating_date = self.validate_date_param(
                request.query_params.get('calculating_date'),
                'calculating_date'
            )
            
            # 必須提供模型名稱和版本
            model_name = request.query_params.get('model_name')
            model_version = request.query_params.get('model_version')
            if not model_name or not model_version:
                return Response(
                    {
                        "result": [{"Message": "Error", "Detail": "必須提供 model_name 和 model_version 參數"}],
                        "code": 1,
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 可選參數
            area_name = request.query_params.get('area_name')
            
            # 構建 SQL 查詢
            sql_query = """
                SELECT 
                    cap.id,
                    pm.name as model_name,
                    pm.version as model_version,
                    cap.trade_date,
                    cap.time_code,
                    cap.calculating_date,
                    cap.price_5,
                    cap.price_50,
                    cap.price_95,
                    cap.additional_data,
                    a.id as area_id,
                    a.name as area_name,
                    a.name_ch as area_name_ch,
                    a.name_jp as area_name_jp
                FROM custom_area_price_predict cap
                JOIN prediction_model pm ON cap.model_id = pm.id
                JOIN area a ON cap.area_id = a.id
                WHERE 
                    cap.trade_date BETWEEN %s AND %s
                    AND pm.name = %s
                    AND pm.version = %s
                    AND cap.calculating_date = %s
                    {area_filter}
                ORDER BY cap.trade_date, cap.time_code, a.name
            """
            
            # 添加區域過濾條件
            area_filter = ""
            params = [start_date, end_date, model_name, model_version, calculating_date]
            if area_name:
                area_filter = "AND a.name = %s"
                params.append(area_name)
            
            # 格式化 SQL 查詢
            sql_query = sql_query.format(area_filter=area_filter)
            
            # 執行原生 SQL 查詢
            with connection.cursor() as cursor:
                cursor.execute(sql_query, params)
                
                # 獲取列名
                columns = [col[0] for col in cursor.description]
                
                # 獲取結果
                results = []
                for row in cursor.fetchall():
                    # 將查詢結果轉換為字典
                    result_dict = dict(zip(columns, row))
                    results.append(result_dict)
            
            # 本次查詢資訊
            logger.debug(f"==== 查詢特定計算日期的預測資料 ====")
            logger.debug(f"查詢日期範圍：{start_date} 到 {end_date}")
            logger.debug(f"特定計算日期：{calculating_date}")
            logger.debug(f"查詢電力區域：{area_name if area_name else '所有區域'}")
            logger.debug(f"查詢模型：{model_name} {model_version}")
            logger.debug(f"查詢結果數量：{len(results)}")
            logger.debug(f"=========================")

            return Response({
                "result": [{"Message": "Success"}],
                "count": len(results),
                "code": 0,
                "data": results
            })
            
        except ValueError as e:
            return Response(
                {
                    "result": [{"Message": "Error", "Detail": str(e)}],
                    "count": 0,
                    "code": 1,
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            import traceback
            logger.error(f"查詢特定計算日期的預測資料錯誤：{str(e)}\n{traceback.format_exc()}")
            return Response(
                {
                    "result": [{"Message": "Error", "Detail": str(e)}],
                    "count": 0,
                    "code": 1,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


    @swagger_auto_schema(
        operation_summary="批量上傳預測資料",
        operation_description="批量上傳自定義區域價格預測資料",
        request_body=CustomAreaPricePredictBulkCreateSerializer,
        responses={
            "201": openapi.Response(
                description="成功上傳資料",
                examples={
                    "application/json": {
                        "result": [{"Message": "Success"}],
                        "code": 0,
                        "data": {
                            "created_count": 100,
                            "updated_count": 0
                        }
                    }
                },
            ),
            "400": openapi.Response(
                description="參數錯誤",
                examples={
                    "application/json": {
                        "result": [{"Message": "Error", "Detail": "預測資料格式錯誤"}],
                        "code": 1,
                    }
                },
            )
        },
    )
    @action(detail=False, methods=['post'], url_path='upload-predictions')
    @transaction.atomic  # 使用atomic確保資料庫一致性
    def upload_predictions(self, request):
        """批量上傳預測資料"""
        try:
            # 驗證請求資料
            serializer = CustomAreaPricePredictBulkCreateSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {
                        "result": [{"Message": "Error", "Detail": serializer.errors}],
                        "code": 1,
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 獲取驗證後的資料
            validated_data = serializer.validated_data
            model = validated_data['model']
            calculating_date = validated_data['calculating_date']
            predictions = validated_data['predictions']
            
            # 創建或更新預測　
            created_count = 0
            updated_count = 0
            
            for prediction in predictions:
                # 獲取必要欄位
                trade_date = prediction['trade_date']
                time_code = prediction['time_code']
                area = prediction['area']
                price_50 = prediction['price_50']
                
                # 獲取可選欄位
                price_5 = prediction.get('price_5')
                price_95 = prediction.get('price_95')
                additional_data = prediction.get('additional_data')
                
                # 嘗試獲取現有預測
                try:
                    existing_prediction = CustomAreaPricePredict.objects.get(
                        model=model,
                        trade_date=trade_date,
                        time_code=time_code,
                        area=area,
                        calculating_date=calculating_date
                    )
                    
                    # 更新現有預測
                    existing_prediction.price_5 = price_5
                    existing_prediction.price_50 = price_50
                    existing_prediction.price_95 = price_95
                    existing_prediction.additional_data = additional_data
                    existing_prediction.save()
                    
                    updated_count += 1
                    
                except CustomAreaPricePredict.DoesNotExist:
                    # 創建新預測
                    CustomAreaPricePredict.objects.create(
                        model=model,
                        trade_date=trade_date,
                        time_code=time_code,
                        area=area,
                        calculating_date=calculating_date,
                        price_5=price_5,
                        price_50=price_50,
                        price_95=price_95,
                        additional_data=additional_data
                    )
                    
                    created_count += 1
            
            # 本次上傳資訊
            logger.info(f"==== 批量上傳預測資料 ====")
            logger.info(f"上傳用戶：{request.user.username}")
            logger.info(f"模型：{model.name} v{model.version}")
            logger.info(f"計算日期：{calculating_date}")
            logger.info(f"新建記錄數：{created_count}")
            logger.info(f"更新記錄數：{updated_count}")
            logger.info(f"=========================")

            return Response(
                {
                    "result": [{"Message": "Success"}],
                    "code": 0,
                    "data": {
                        "created_count": created_count,
                        "updated_count": updated_count
                    }
                },
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            import traceback
            logger.error(f"批量上傳預測資料錯誤：{str(e)}\n{traceback.format_exc()}")
            return Response(
                {
                    "result": [{"Message": "Error", "Detail": str(e)}],
                    "code": 1,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @swagger_auto_schema(
        operation_summary="獲取所有可用的預測模型列表",
        operation_description="獲取系統中所有可用的預測模型列表",
        responses={
            "200": openapi.Response(
                description="成功獲取資料",
                examples={
                    "application/json": {
                        "result": [{"Message": "Success"}],
                        "code": 0,
                        "data": [
                            {
                                "id": 1,
                                "name": "MyModel",
                                "version": "1.0.0",
                                "description": "自定義預測模型",
                                "created_at": "2025-01-01T00:00:00Z",
                                "updated_at": "2025-01-01T00:00:00Z"
                            }
                        ]
                    }
                },
            )
        },
    )
    @action(detail=False, methods=['get'], url_path='available-models')
    def available_models(self, request):
        """獲取所有可用的預測模型列表"""
        try:
            # 構建 SQL 查詢
            sql_query = """
                SELECT 
                    id,
                    name,
                    version,
                    description,
                    created_at,
                    updated_at
                FROM prediction_model
                ORDER BY name, version DESC
            """
            
            # 執行查詢
            with connection.cursor() as cursor:
                cursor.execute(sql_query)
                columns = [col[0] for col in cursor.description]
                results = []
                for row in cursor.fetchall():
                    result_dict = dict(zip(columns, row))
                    results.append(result_dict)
            
            return Response({
                "result": [{"Message": "Success"}],
                "code": 0,
                "data": results
            })
            
        except Exception as e:
            import traceback
            logger.error(f"查詢可用預測模型列表錯誤：{str(e)}\n{traceback.format_exc()}")
            return Response(
                {
                    "result": [{"Message": "Error", "Detail": str(e)}],
                    "code": 1,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def validate_date_param(self, date_str, param_name):
        """驗證日期參數"""
        if not date_str:
            raise ValueError(f'必須提供 {param_name} 參數 (YYYYMMDD 格式)')
        
        try:
            return datetime.datetime.strptime(date_str, '%Y%m%d').date()
        except ValueError:
            raise ValueError(f'{param_name} 格式錯誤，應為 YYYYMMDD')
