from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from django.utils import timezone
import datetime
from django.db.models import Q
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

from .models import ActualWeather, WeatherForecast
from .serializers import ActualWeatherSerializer, WeatherForecastSerializer

import logging
logger = logging.getLogger(__name__)

class WeatherViewSet(viewsets.ViewSet):
    """
    天氣資料 API
    """
    permission_classes = (AllowAny,)
    
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
                'city', 
                openapi.IN_QUERY, 
                description="城市名稱 (選填)", 
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
                                "area_name": "東京電力",
                                "area_name_jp": "東京電力",
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
            
            # 可選的城市過濾
            city = request.query_params.get('city')
            
            # 建立查詢（不包含時間範圍的結束日期）
            queryset = ActualWeather.objects.filter(
                weather_datetime__range=(
                    start_date,
                    end_date + datetime.timedelta(days=1) - datetime.timedelta(seconds=1)
                )
            )
            
            if city:
                queryset = queryset.filter(city=city)
            
            # 序列化資料
            serializer = ActualWeatherSerializer(queryset, many=True)

            # 本次查詢資訊
            logger.debug(f"==== 查詢天氣實際資料 ====")
            logger.debug(f"查詢日期範圍：{start_date} 到 {end_date}")
            # 實際查詢到的日期範圍
            actual_dates = queryset.values_list('weather_datetime', flat=True).distinct()
            logger.debug(f"實際查詢到的日期範圍：{actual_dates.first()} 到 {actual_dates.last()}")
            logger.debug(f"查詢城市：{city if city else '所有城市'}")
            logger.debug(f"查詢結果數量：{len(serializer.data)}")
            logger.debug(f"=========================")


            return Response({
                "result": [{"Message": "Success"}],
                "code": 0,
                "data": serializer.data
            })
            
        except ValueError as e:
            return Response(
                {
                    "result": [{"Message": "Error", "Detail": str(e)}],
                    "code": 1,
                },
                status=status.HTTP_400_BAD_REQUEST
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
                'city', 
                openapi.IN_QUERY, 
                description="城市名稱 (選填)", 
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
                                "area_name": "東京電力",
                                "area_name_jp": "東京電力",
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
            city = request.query_params.get('city')
            latest_only = request.query_params.get('latest_only', 'true').lower() == 'true'
            
            # 建立查詢
            queryset = WeatherForecast.objects.filter(
                weather_datetime__range=(
                    start_date,
                    end_date + datetime.timedelta(days=1)
                )
            )
            
            if city:
                queryset = queryset.filter(city=city)
            
            if latest_only:
                # 獲取每個組合的最新預測資料
                from django.db.models import Max, F, OuterRef, Subquery
                
                # 子查詢：找出每個組合的最新 get_datetime
                latest_times = WeatherForecast.objects.filter(
                    weather_datetime__range=(start_date, end_date + datetime.timedelta(days=1))
                )
                if city:
                    latest_times = latest_times.filter(city=city)
                
                latest_times = latest_times.values('weather_datetime', 'area', 'city').annotate(
                    latest_get_datetime=Max('get_datetime')
                )

                # 使用組合條件過濾
                filter_q = Q()
                for item in latest_times:
                    filter_q |= Q(
                        weather_datetime=item['weather_datetime'],
                        area=item['area'],
                        city=item['city'],
                        get_datetime=item['latest_get_datetime']
                    )
                
                queryset = queryset.filter(filter_q)

            serializer = WeatherForecastSerializer(queryset, many=True)

            # 本次查詢資訊
            logger.debug(f"==== 查詢天氣預測資料 ====")
            logger.debug(f"查詢日期範圍：{start_date} 到 {end_date}")
            # 實際查詢到的日期範圍
            actual_dates = queryset.values_list('weather_datetime', flat=True).distinct()
            logger.debug(f"實際查詢到的日期範圍：{actual_dates.first()} 到 {actual_dates.last()}")
            logger.debug(f"查詢城市：{city if city else '所有城市'}")
            logger.debug(f"是否只返回最新預測：{latest_only}")
            logger.debug(f"查詢結果數量：{len(serializer.data)}")
            logger.debug(f"=========================")

            return Response({
                "result": [{"Message": "Success"}],
                "code": 0,
                "data": serializer.data
            })
            
        except ValueError as e:
            return Response(
                {
                    "result": [{"Message": "Error", "Detail": str(e)}],
                    "code": 1,
                },
                status=status.HTTP_400_BAD_REQUEST
            )

    def validate_date_param(self, date_str, param_name):
        """驗證日期參數"""
        if not date_str:
            raise ValueError(f'必須提供 {param_name} 參數 (YYYYMMDD 格式)')
        
        try:
            return datetime.datetime.strptime(date_str, '%Y%m%d')
        except ValueError:
            raise ValueError(f'{param_name} 格式錯誤，應為 YYYYMMDD')
