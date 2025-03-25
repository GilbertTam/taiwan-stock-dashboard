from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.utils import timezone
import datetime
from django.db.models import Q
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from django.db import connection

from .models import ActualWeather, WeatherForecast
from .serializers import ActualWeatherSerializer, WeatherForecastSerializer
from area.models import Area

import logging
logger = logging.getLogger(__name__)

class WeatherViewSet(viewsets.ViewSet):
    """
    天氣資料 API
    """
    permission_classes = (IsAuthenticated,)
    
    @swagger_auto_schema(
        operation_summary="獲取實際天氣資料",
        operation_description="根據日期範圍獲取實際天氣資料",
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
                description="電力區域名稱 (選填)", 
                type=openapi.TYPE_STRING,
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
                                "name": "tokyo",
                                "name_jp": "東京",
                                "weather_datetime": "2025-01-01T12:00:00Z",
                                "temperature": 10.5,
                                "rainfall": 0.0,
                                "snowfall": 0.0,
                                "wind_speed": 3.2,
                                "wind_direction": "北",
                                "relative_humidity": 65.0,
                                "weather_id": 1,
                                "city": "東京",
                                "deepest_snow": 0.0,
                                "sunshine_hours": 5.5
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
    @action(detail=False, methods=['get'])
    def actual(self, request):
        """獲取實際天氣資料"""
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
            
            # 可選的區域過濾
            area_name = request.query_params.get('name')
            
            # 使用原生 SQL 查詢
            sql_query = """
                SELECT 
                    aw.id,
                    aw.weather_datetime,
                    aw.temperature,
                    aw.rainfall,
                    aw.snowfall,
                    aw.wind_speed,
                    aw.wind_direction,
                    aw.relative_humidity,
                    aw.weather_id,
                    aw.city,
                    aw.deepest_snow,
                    aw.sunshine_hours,
                    a.name as name,
                    a.name_jp as name_jp,
                    a.name_ch as name_ch
                FROM actual_weather aw
                JOIN area a ON aw.area_id = a.id
                WHERE aw.weather_datetime BETWEEN %s AND %s
                {area_filter}
                ORDER BY aw.weather_datetime, a.name
            """
            
            # 處理時區問題
            from django.utils import timezone
            start_date_aware = timezone.make_aware(start_date) if timezone.is_naive(start_date) else start_date
            end_date_aware = timezone.make_aware(end_date + datetime.timedelta(days=1) - datetime.timedelta(seconds=1)) if timezone.is_naive(end_date + datetime.timedelta(days=1) - datetime.timedelta(seconds=1)) else (end_date + datetime.timedelta(days=1) - datetime.timedelta(seconds=1))
            
            # 準備查詢參數
            params = [start_date_aware, end_date_aware]
            
            # 根據是否有區域名稱過濾條件來修改 SQL
            area_filter = ""
            if area_name:
                area_filter = "AND a.name = %s"
                params.append(area_name)
            
            # 格式化 SQL 查詢
            sql_query = sql_query.format(area_filter=area_filter)
            
            # 執行查詢
            with connection.cursor() as cursor:
                cursor.execute(sql_query, params)
                columns = [col[0] for col in cursor.description]
                results = []
                for row in cursor.fetchall():
                    result_dict = dict(zip(columns, row))
                    # 處理時區 - 將 UTC 時間轉換回本地時間
                    if result_dict['weather_datetime'] and timezone.is_aware(result_dict['weather_datetime']):
                        result_dict['weather_datetime'] = timezone.localtime(result_dict['weather_datetime'])
                    results.append(result_dict)
            
            # 本次查詢資訊
            logger.debug(f"==== 查詢天氣實際資料 ====")
            logger.debug(f"查詢日期範圍：{start_date} 到 {end_date}")
            logger.debug(f"查詢電力區域：{area_name if area_name else '所有區域'}")
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
            logger.error(f"查詢天氣實際資料錯誤：{str(e)}\n{traceback.format_exc()}")
            return Response(
                {
                    "result": [{"Message": "Error", "Detail": str(e)}],
                    "code": 1,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @swagger_auto_schema(
        operation_summary="獲取天氣預測資料",
        operation_description="根據日期範圍獲取天氣預測資料",
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
                description="電力區域名稱 (選填)", 
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
                                "name": "tokyo",
                                "name_jp": "東京",
                                "weather_datetime": "2025-01-01T12:00:00Z",
                                "temperature": 10.5,
                                "rainfall": 0.0,
                                "snowfall": 0.0,
                                "wind_speed": 3.2,
                                "wind_direction": "北",
                                "relative_humidity": 65.0,
                                "weather_id": 1,
                                "city": "東京",
                                "get_datetime": "2024-12-31T12:00:00Z",
                                "clouds_all": 25
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
    @action(detail=False, methods=['get'])
    def forecast(self, request):
        """獲取天氣預測資料"""
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
            
            # 處理時區問題
            from django.utils import timezone
            start_date_aware = timezone.make_aware(start_date) if timezone.is_naive(start_date) else start_date
            end_date_aware = timezone.make_aware(end_date + datetime.timedelta(days=1)) if timezone.is_naive(end_date + datetime.timedelta(days=1)) else (end_date + datetime.timedelta(days=1))
            
            # 構建 SQL 查詢
            if latest_only:
                # 使用窗口函數獲取最新預測
                sql_query = """
                    WITH latest_forecasts AS (
                        SELECT 
                            wf.id,
                            wf.area_id,
                            wf.city,
                            wf.weather_datetime,
                            wf.get_datetime,
                            wf.temperature,
                            wf.rainfall,
                            wf.snowfall,
                            wf.wind_speed,
                            wf.wind_direction,
                            wf.relative_humidity,
                            wf.weather_id,
                            wf.clouds_all,
                            a.name as name,
                            a.name_jp as name_jp,
                            a.name_ch as name_ch,
                            ROW_NUMBER() OVER(
                                PARTITION BY wf.weather_datetime, wf.area_id, wf.city 
                                ORDER BY wf.get_datetime DESC
                            ) as rn
                        FROM weather_forecast wf
                        JOIN area a ON wf.area_id = a.id
                        WHERE 
                            wf.weather_datetime BETWEEN %s AND %s
                            {area_filter}
                    )
                    SELECT 
                        id,
                        area_id,
                        city,
                        weather_datetime,
                        get_datetime,
                        temperature,
                        rainfall,
                        snowfall,
                        wind_speed,
                        wind_direction,
                        relative_humidity,
                        weather_id,
                        clouds_all,
                        name,
                        name_jp,
                        name_ch
                    FROM latest_forecasts
                    WHERE rn = 1
                    ORDER BY weather_datetime, name, city
                """
            else:
                # 獲取所有預測
                sql_query = """
                    SELECT 
                        wf.id,
                        wf.area_id,
                        wf.city,
                        wf.weather_datetime,
                        wf.get_datetime,
                        wf.temperature,
                        wf.rainfall,
                        wf.snowfall,
                        wf.wind_speed,
                        wf.wind_direction,
                        wf.relative_humidity,
                        wf.weather_id,
                        wf.clouds_all,
                        a.name as name,
                        a.name_jp as name_jp,
                        a.name_ch as name_ch
                    FROM weather_forecast wf
                    JOIN area a ON wf.area_id = a.id
                    WHERE 
                        wf.weather_datetime BETWEEN %s AND %s
                        {area_filter}
                    ORDER BY wf.weather_datetime, a.name, wf.city, wf.get_datetime DESC
                """
            
            # 添加區域過濾條件
            area_filter = ""
            params = [start_date_aware, end_date_aware]
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
                    
                    # 處理時區 - 將 UTC 時間轉換回本地時間
                    for dt_field in ['weather_datetime', 'get_datetime']:
                        if result_dict[dt_field] and timezone.is_aware(result_dict[dt_field]):
                            result_dict[dt_field] = timezone.localtime(result_dict[dt_field])
                    
                    results.append(result_dict)
            
            # 本次查詢資訊
            logger.debug(f"==== 查詢天氣預測資料 ====")
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
            logger.error(f"查詢天氣預測資料錯誤：{str(e)}\n{traceback.format_exc()}")
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
            return datetime.datetime.strptime(date_str, '%Y%m%d')
        except ValueError:
            raise ValueError(f'{param_name} 格式錯誤，應為 YYYYMMDD')
