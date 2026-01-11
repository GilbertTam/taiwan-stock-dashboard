from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
import datetime
import logging

from spot_market.serializers import SpotTradeSerializer
from common.es_service import ESService

logger = logging.getLogger(__name__)

class SpotMarketViewSet(viewsets.ViewSet):
    """
    現貨市場資料 API
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
        operation_summary="獲取現貨市場交易資料",
        manual_parameters=[
            openapi.Parameter('start_date', openapi.IN_QUERY, description="開始日期 (YYYYMMDD)", type=openapi.TYPE_STRING, required=True),
            openapi.Parameter('end_date', openapi.IN_QUERY, description="結束日期 (YYYYMMDD)", type=openapi.TYPE_STRING, required=True),
            openapi.Parameter('name', openapi.IN_QUERY, description="電力區域名稱", type=openapi.TYPE_STRING, required=False),
        ],
        responses={200: SpotTradeSerializer(many=True)}
    )
    @action(detail=False, methods=['get'], url_path='trades')
    def trades(self, request):
        try:
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            area_name = request.query_params.get('name')

            self.validate_date_param(start_date, 'start_date')
            self.validate_date_param(end_date, 'end_date')

            es_service = ESService()
            results = es_service.get_jepx_trades(
                start_date=start_date,
                end_date=end_date,
                area_name=area_name
            )

            return Response({
                "result": [{"Message": "Success"}],
                "code": 0,
                "data": results
            })
        except ValueError as e:
            return Response({"result": [{"Message": "Error", "Detail": str(e)}], "code": 1}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error fetching spot trades: {e}")
            return Response({"result": [{"Message": "Error", "Detail": str(e)}], "code": 1}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @swagger_auto_schema(
        operation_summary="獲取區域價格資料",
        manual_parameters=[
            openapi.Parameter('start_date', openapi.IN_QUERY, description="開始日期 (YYYYMMDD)", type=openapi.TYPE_STRING, required=True),
            openapi.Parameter('end_date', openapi.IN_QUERY, description="結束日期 (YYYYMMDD)", type=openapi.TYPE_STRING, required=True),
            openapi.Parameter('name', openapi.IN_QUERY, description="電力區域名稱", type=openapi.TYPE_STRING, required=True),
        ],
        responses={200: SpotTradeSerializer(many=True)}
    )
    @action(detail=False, methods=['get'], url_path='area-prices')
    def area_prices(self, request):
        try:
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            area_name = request.query_params.get('name')

            self.validate_date_param(start_date, 'start_date')
            self.validate_date_param(end_date, 'end_date')
            
            if not area_name:
                return Response({"result": [{"Message": "Error", "Detail": "Missing required params"}]}, status=status.HTTP_400_BAD_REQUEST)

            es_service = ESService()
            results = es_service.get_jepx_trades(
                start_date=start_date,
                end_date=end_date,
                area_name=area_name
            )
            
            # The structure is the same, so we reuse the logic
            return Response({
                "result": [{"Message": "Success"}],
                "code": 0,
                "data": results
            })
        except ValueError as e:
            return Response({"result": [{"Message": "Error", "Detail": str(e)}], "code": 1}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error fetching area prices: {e}")
            return Response({"result": [{"Message": "Error", "Detail": str(e)}], "code": 1}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
