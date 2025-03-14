from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db import connection
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
import datetime

from .models import QuickAreaPricePredict
from .serializers import QuickAreaPricePredictSerializer

import logging
logger = logging.getLogger(__name__)

class QuickPredictViewSet(viewsets.ViewSet):
    """
    QUICK區域價格預測 API
    """
    permission_classes = (IsAuthenticated,)
    
    @swagger_auto_schema(
        operation_summary="獲取QUICK區域價格預測資料",
        operation_description="根據日期範圍和區域獲取QUICK區域價格預測資料",
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
                'name', 
                openapi.IN_QUERY, 
                description="電力區域名稱 (選填，如不提供則返回所有區域預測)", 
                type=openapi.TYPE_STRING,
                required=False
            ),
            openapi.Parameter(
                'latest_only', 
                openapi.IN_QUERY, 
                description="是否只返回最新預測 (預設為true)", 
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
                                "trade_date": "2025-01-01",
                                "time_code": 1,
                                "calculating_date": "2024-12-31",
                                "name": "東京",
                                "name_ch": "東京",
                                "name_jp": "東京",
                                "price_5": "8.50",
                                "price_50": "10.50",
                                "price_95": "12.50"
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
        """獲取QUICK區域價格預測資料"""
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
            
            # 可選參數
            area_name = request.query_params.get('name')
            latest_only = request.query_params.get('latest_only', 'true').lower() == 'true'
            
            # 構建 SQL 查詢
            if latest_only:
                # 使用窗口函數獲取最新預測
                sql_query = """
                    WITH latest_predictions AS (
                        SELECT 
                            qapp.id,
                            qapp.trade_date,
                            qapp.time_code,
                            qapp.calculating_date,
                            qapp.price_5,
                            qapp.price_50,
                            qapp.price_95,
                            a.id as area_id,
                            a.name as name,
                            a.name_ch as name_ch,
                            a.name_jp as name_jp,
                            ROW_NUMBER() OVER(
                                PARTITION BY qapp.trade_date, qapp.time_code, qapp.area_id
                                ORDER BY qapp.calculating_date DESC
                            ) as rn
                        FROM quick_area_price_predict qapp
                        JOIN area a ON qapp.area_id = a.id
                        WHERE 
                            qapp.trade_date BETWEEN %s AND %s
                            {area_filter}
                    )
                    SELECT 
                        id,
                        trade_date,
                        time_code,
                        calculating_date,
                        price_5,
                        price_50,
                        price_95,
                        area_id,
                        name,
                        name_ch,
                        name_jp
                    FROM latest_predictions
                    WHERE rn = 1
                    ORDER BY trade_date, time_code, name
                """
            else:
                # 獲取所有預測
                sql_query = """
                    SELECT 
                        qapp.id,
                        qapp.trade_date,
                        qapp.time_code,
                        qapp.calculating_date,
                        qapp.price_5,
                        qapp.price_50,
                        qapp.price_95,
                        a.id as area_id,
                        a.name as name,
                        a.name_ch as name_ch,
                        a.name_jp as name_jp
                    FROM quick_area_price_predict qapp
                    JOIN area a ON qapp.area_id = a.id
                    WHERE 
                        qapp.trade_date BETWEEN %s AND %s
                        {area_filter}
                    ORDER BY qapp.trade_date, qapp.time_code, a.name, qapp.calculating_date DESC
                """
            
            # 添加區域過濾條件
            area_filter = ""
            params = [start_date, end_date]
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
            logger.debug(f"==== 查詢QUICK區域價格預測資料 ====")
            logger.debug(f"查詢日期範圍：{start_date} 到 {end_date}")
            logger.debug(f"查詢電力區域：{area_name if area_name else '所有區域'}")
            logger.debug(f"是否只返回最新預測：{latest_only}")
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
            logger.error(f"查詢QUICK區域價格預測資料錯誤：{str(e)}\n{traceback.format_exc()}")
            return Response(
                {
                    "result": [{"Message": "Error", "Detail": str(e)}],
                    "code": 1,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @swagger_auto_schema(
        operation_summary="獲取特定計算日期的QUICK區域價格預測資料",
        operation_description="根據交易日期範圍、區域和計算日期獲取QUICK區域價格預測資料",
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
                'name', 
                openapi.IN_QUERY, 
                description="電力區域名稱", 
                type=openapi.TYPE_STRING,
                required=True
            ),
            openapi.Parameter(
                'calculating_date', 
                openapi.IN_QUERY, 
                description="預測計算日期 (YYYYMMDD)", 
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
                                "trade_date": "2025-01-01",
                                "time_code": 1,
                                "calculating_date": "2024-12-31",
                                "name": "東京",
                                "price_5": "8.50",
                                "price_50": "10.50",
                                "price_95": "12.50"
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
    @action(detail=False, methods=['get'], url_path='specific-predictions')
    def specific_predictions(self, request):
        """獲取特定計算日期的QUICK區域價格預測資料"""
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
            
            # 必須提供區域名稱
            area_name = request.query_params.get('name')
            if not area_name:
                return Response(
                    {
                        "result": [{"Message": "Error", "Detail": "必須提供 name 參數"}],
                        "code": 1,
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 構建 SQL 查詢
            sql_query = """
                SELECT 
                    qapp.trade_date,
                    qapp.time_code,
                    qapp.calculating_date,
                    qapp.price_5,
                    qapp.price_50,
                    qapp.price_95,
                    a.name as name,
                    a.name_ch as name_ch,
                    a.name_jp as name_jp
                FROM quick_area_price_predict qapp
                JOIN area a ON qapp.area_id = a.id
                WHERE 
                    qapp.trade_date BETWEEN %s AND %s
                    AND a.name = %s
                    AND qapp.calculating_date = %s
                ORDER BY qapp.trade_date, qapp.time_code
            """
            
            # 執行查詢
            with connection.cursor() as cursor:
                cursor.execute(sql_query, [start_date, end_date, area_name, calculating_date])
                columns = [col[0] for col in cursor.description]
                results = []
                for row in cursor.fetchall():
                    result_dict = dict(zip(columns, row))
                    results.append(result_dict)
            
            # 本次查詢資訊
            logger.debug(f"==== 查詢特定計算日期的QUICK區域價格預測資料 ====")
            logger.debug(f"查詢日期範圍：{start_date} 到 {end_date}")
            logger.debug(f"查詢電力區域：{area_name}")
            logger.debug(f"計算日期：{calculating_date}")
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
            logger.error(f"查詢特定計算日期的QUICK區域價格預測資料錯誤：{str(e)}\n{traceback.format_exc()}")
            return Response(
                {
                    "result": [{"Message": "Error", "Detail": str(e)}],
                    "code": 1,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @swagger_auto_schema(
        operation_summary="獲取可用的預測計算日期列表",
        operation_description="獲取指定日期範圍和區域的可用預測計算日期列表",
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
                'name', 
                openapi.IN_QUERY, 
                description="電力區域名稱", 
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
            
            # 必須提供區域名稱
            area_name = request.query_params.get('name')
            if not area_name:
                return Response(
                    {
                        "result": [{"Message": "Error", "Detail": "必須提供 name 參數"}],
                        "code": 1,
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 構建 SQL 查詢
            sql_query = """
                SELECT DISTINCT
                    qapp.calculating_date
                FROM quick_area_price_predict qapp
                JOIN area a ON qapp.area_id = a.id
                WHERE 
                    qapp.trade_date BETWEEN %s AND %s
                    AND a.name = %s
                ORDER BY qapp.calculating_date DESC
            """
            
            # 執行查詢
            with connection.cursor() as cursor:
                cursor.execute(sql_query, [start_date, end_date, area_name])
                results = [{"calculating_date": row[0]} for row in cursor.fetchall()]
            
            # 本次查詢資訊
            logger.debug(f"==== 查詢可用的預測計算日期列表 ====")
            logger.debug(f"查詢日期範圍：{start_date} 到 {end_date}")
            logger.debug(f"查詢電力區域：{area_name}")
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

    def validate_date_param(self, date_str, param_name):
        """驗證日期參數"""
        if not date_str:
            raise ValueError(f'必須提供 {param_name} 參數 (YYYYMMDD 格式)')
        
        try:
            return datetime.datetime.strptime(date_str, '%Y%m%d').date()
        except ValueError:
            raise ValueError(f'{param_name} 格式錯誤，應為 YYYYMMDD')
