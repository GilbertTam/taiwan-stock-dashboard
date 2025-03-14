from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db import connection
from django.utils import timezone
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
import datetime
from django.db.models import Prefetch, OuterRef, Subquery

from spot_market.models import SpotTrade, AreaPrice
from area.models import Area
from spot_market.serializers import SpotTradeSerializer, AreaPriceSerializer, SpotTradeWithAreaPriceSerializer

import logging
logger = logging.getLogger(__name__)

class SpotMarketViewSet(viewsets.ViewSet):
    """
    現貨市場資料 API
    """
    permission_classes = (IsAuthenticated,)
    
    @swagger_auto_schema(
        operation_summary="獲取現貨市場交易資料",
        operation_description="根據日期範圍獲取現貨市場交易資料",
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
                description="電力區域名稱 (選填，如不提供則返回所有區域價格)", 
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
                                "id": 1,
                                "trade_date": "2025-01-01",
                                "time_code": 1,
                                "sell_quantity": 1000,
                                "buy_quantity": 1000,
                                "contract_quantity": 1000,
                                "system_price": "10.50",
                                "name": "東京",
                                "name_ch": "東京",
                                "name_jp": "東京",
                                "price": "10.50",
                                "avoidable_cost": "0.50"
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
    def trades(self, request):
        """獲取現貨市場交易資料"""
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
            
            # 構建 SQL 查詢
            sql_query = """
                SELECT 
                    st.id,
                    st.trade_date,
                    st.time_code,
                    st.sell_quantity,
                    st.buy_quantity,
                    st.contract_quantity,
                    st.system_price,
                    a.id as area_id,
                    a.name as name,
                    a.name_ch as name_ch,
                    a.name_jp as name_jp,
                    ap.price,
                    ap.avoidable_cost
                FROM spot_trade st
                JOIN area_price ap ON st.id = ap.spot_trade_id
                JOIN area a ON ap.area_id = a.id
                WHERE 
                    st.trade_date BETWEEN %s AND %s
                    {area_filter}
                ORDER BY st.trade_date, st.time_code, a.name
            """
            
            # 準備查詢參數
            params = [start_date, end_date]
            
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
                    results.append(result_dict)
            
            # 本次查詢資訊
            logger.debug(f"==== 查詢現貨市場交易資料 ====")
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
            logger.error(f"查詢現貨市場交易資料錯誤：{str(e)}\n{traceback.format_exc()}")
            return Response(
                {
                    "result": [{"Message": "Error", "Detail": str(e)}],
                    "code": 1,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @swagger_auto_schema(
        operation_summary="獲取區域價格資料",
        operation_description="根據日期範圍獲取特定區域的價格資料",
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
                            {
                                "trade_date": "2025-01-01",
                                "time_code": 1,
                                "price": "10.50",
                                "avoidable_cost": "0.50",
                                "system_price": "10.00"
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
    def area_prices(self, request):
        """獲取區域價格資料"""
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
                SELECT 
                    st.trade_date,
                    st.time_code,
                    st.system_price,
                    a.name as name,
                    a.name_ch as name_ch,
                    a.name_jp as name_jp,
                    ap.price,
                    ap.avoidable_cost
                FROM spot_trade st
                JOIN area_price ap ON st.id = ap.spot_trade_id
                JOIN area a ON ap.area_id = a.id
                WHERE 
                    st.trade_date BETWEEN %s AND %s
                    AND a.name = %s
                ORDER BY st.trade_date, st.time_code
            """
            
            # 執行查詢
            with connection.cursor() as cursor:
                cursor.execute(sql_query, [start_date, end_date, area_name])
                columns = [col[0] for col in cursor.description]
                results = []
                for row in cursor.fetchall():
                    result_dict = dict(zip(columns, row))
                    results.append(result_dict)
            
            # 本次查詢資訊
            logger.debug(f"==== 查詢區域價格資料 ====")
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
            logger.error(f"查詢區域價格資料錯誤：{str(e)}\n{traceback.format_exc()}")
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