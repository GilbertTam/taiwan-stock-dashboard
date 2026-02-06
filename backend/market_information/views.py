"""
Market Information API
This API provides market information data from the Elasticsearch database.
Endpoints:
- spot-market-trades: Get spot market trades (JEPX)
- spot-market-area-prices: Get area prices from spot market
- imbalance: Get imbalance data
- hjks: Get HJKS outages
- interconnection: Get interconnection flows
- intraday: Get intraday data
- earthquakes: Get earthquakes
- occto-area: Get OCCTO area data
- occto-inter: Get OCCTO interconnection
- occto-event: Get OCCTO events
- tdgc: Get TDGC data
- weather-actual: Get weather actual data
- weather-forecast: Get weather forecast data


Example Request:
GET /api/market-info/spot-market-trades?start_date=20250101&end_date=20250102&name=hokkaido
GET /api/market-info/spot-market-area-prices?start_date=20250101&end_date=20250102&name=hokkaido
GET /api/market-info/imbalance?start_date=20250101&end_date=20250102
GET /api/market-info/hjks?start_date=20250101&end_date=20250102&area_name=hokkaido
GET /api/market-info/interconnection?start_date=20250101&end_date=20250102&line_name=interconnection1
GET /api/market-info/intraday?start_date=20250101&end_date=20250102
GET /api/market-info/earthquakes?start_date=20250101&end_date=20250102
GET /api/market-info/occto-area?start_date=20250101&end_date=20250102&area_name=area1
GET /api/market-info/occto-inter?start_date=20250101&end_date=20250102
GET /api/market-info/occto-event?start_date=20250101&end_date=20250102
GET /api/market-info/tdgc?start_date=20250101&end_date=20250102&area_name=area1
GET /api/market-info/weather-actual?start_date=20250101&end_date=20250102&area_name=area1
GET /api/market-info/weather-forecast?start_date=20250101&end_date=20250102&area_name=area1

"""

from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
import logging
import datetime

from market_information.serializers import (
    ImbalanceSerializer,
    HjksOutageSerializer,
    InterconnectionFlowSerializer,
    IntradaySerializer,
    EarthquakeSerializer,
    OcctoAreaSerializer,
    OcctoInterconnectionSerializer,
    OcctoEventSerializer,
    TdgcSerializer,
    WeatherActualSerializer,
    WeatherForecastSerializer,
    SpotTradeSerializer
)
from common.es_service import ESService

logger = logging.getLogger(__name__)

class MarketInformationViewSet(viewsets.ViewSet):
    """
    Market Information API
    """
    permission_classes = (IsAuthenticated,)

    def _validate_dates(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        if not start_date or not end_date:
            raise ValueError("start_date and end_date are required (YYYYMMDD)")
        return start_date, end_date

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
    @action(detail=False, methods=['get'], url_path='spot-market-trades')
    def spot_market_trades(self, request):
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
            openapi.Parameter('name', openapi.IN_QUERY, description="電力區域名稱 (可選，不提供則返回所有區域)", type=openapi.TYPE_STRING, required=False),
        ],
        responses={200: SpotTradeSerializer(many=True)}
    )
    @action(detail=False, methods=['get'], url_path='spot-market-area-prices')
    def spot_market_area_prices(self, request):
        try:
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            area_name = request.query_params.get('name')

            self.validate_date_param(start_date, 'start_date')
            self.validate_date_param(end_date, 'end_date')
            
            # area_name is now optional - if not provided, returns all areas

            es_service = ESService()
            results = es_service.get_jepx_trades(
                start_date=start_date,
                end_date=end_date,
                area_name=area_name  # None means all areas
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

    @swagger_auto_schema(
        operation_summary="Get Imbalance Data",
        manual_parameters=[
            openapi.Parameter('start_date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True, description="YYYYMMDD"),
            openapi.Parameter('end_date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True, description="YYYYMMDD"),
        ],
        responses={200: ImbalanceSerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def imbalance(self, request):
        try:
            start_date, end_date = self._validate_dates(request)
            es = ESService()
            data = es.get_imbalance_data(start_date, end_date)
            return Response({"result": "Success", "count": len(data), "data": data})
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error fetching imbalance: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @swagger_auto_schema(
        operation_summary="Get HJKS Outages",
        manual_parameters=[
            openapi.Parameter('start_date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True, description="YYYYMMDD"),
            openapi.Parameter('end_date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True, description="YYYYMMDD"),
            openapi.Parameter('area_name', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=False, description="hokkaido, tohoku, etc."),
        ],
        responses={200: HjksOutageSerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def hjks(self, request):
        try:
            start_date, end_date = self._validate_dates(request)
            area_name = request.query_params.get('area_name')
            es = ESService()
            data = es.get_hjks_outages(start_date, end_date, area_name)
            return Response({"result": "Success", "count": len(data), "data": data})
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error fetching hjks: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @swagger_auto_schema(
        operation_summary="Get Interconnection Flows",
        manual_parameters=[
            openapi.Parameter('start_date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True, description="YYYYMMDD"),
            openapi.Parameter('end_date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True, description="YYYYMMDD"),
            openapi.Parameter('line_name', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=False, description="Interconnection name"),
        ],
        responses={200: InterconnectionFlowSerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def interconnection(self, request):
        try:
            start_date, end_date = self._validate_dates(request)
            line_name = request.query_params.get('line_name')
            es = ESService()
            data = es.get_interconnection_flows(start_date, end_date, line_name)
            return Response({"result": "Success", "count": len(data), "data": data})
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error fetching interconnection: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @swagger_auto_schema(
        operation_summary="Get Intraday Data",
        manual_parameters=[
            openapi.Parameter('start_date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True, description="YYYYMMDD"),
            openapi.Parameter('end_date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True, description="YYYYMMDD"),
        ],
        responses={200: IntradaySerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def intraday(self, request):
        try:
            start_date, end_date = self._validate_dates(request)
            es = ESService()
            data = es.get_intraday_data(start_date, end_date)
            return Response({"result": "Success", "count": len(data), "data": data})
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error fetching intraday: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @swagger_auto_schema(
        operation_summary="Get Earthquakes",
        manual_parameters=[
            openapi.Parameter('start_date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True, description="YYYYMMDD"),
            openapi.Parameter('end_date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True, description="YYYYMMDD"),
        ],
        responses={200: EarthquakeSerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def earthquakes(self, request):
        try:
            start_date, end_date = self._validate_dates(request)
            es = ESService()
            data = es.get_earthquakes(start_date, end_date)
            return Response({"result": "Success", "count": len(data), "data": data})
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error fetching earthquakes: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @swagger_auto_schema(
        operation_summary="Get OCCTO Area Data",
        manual_parameters=[
            openapi.Parameter('start_date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True, description="YYYYMMDD"),
            openapi.Parameter('end_date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True, description="YYYYMMDD"),
            openapi.Parameter('area_name', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=False, description="Area name"),
        ],
        responses={200: OcctoAreaSerializer(many=True)}
    )
    @action(detail=False, methods=['get'], url_path='occto-area')
    def occto_area(self, request):
        try:
            start_date, end_date = self._validate_dates(request)
            area_name = request.query_params.get('area_name')
            es = ESService()
            data = es.get_occto_area_data(start_date, end_date, area_name)
            return Response({"result": "Success", "count": len(data), "data": data})
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error fetching occto area: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @swagger_auto_schema(
        operation_summary="Get OCCTO Interconnection",
        manual_parameters=[
            openapi.Parameter('start_date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True, description="YYYYMMDD"),
            openapi.Parameter('end_date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True, description="YYYYMMDD"),
        ],
        responses={200: OcctoInterconnectionSerializer(many=True)}
    )
    @action(detail=False, methods=['get'], url_path='occto-inter')
    def occto_inter(self, request):
        try:
            start_date, end_date = self._validate_dates(request)
            es = ESService()
            data = es.get_occto_interconnection(start_date, end_date)
            return Response({"result": "Success", "count": len(data), "data": data})
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.error(f"Error fetching occto inter: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @swagger_auto_schema(
        operation_summary="Get OCCTO Events",
        manual_parameters=[
            openapi.Parameter('start_date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True, description="YYYYMMDD"),
            openapi.Parameter('end_date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True, description="YYYYMMDD"),
        ],
        responses={200: OcctoEventSerializer(many=True)}
    )
    @action(detail=False, methods=['get'], url_path='occto-event')
    def occto_event(self, request):
        try:
            start_date, end_date = self._validate_dates(request)
            es = ESService()
            data = es.get_occto_events(start_date, end_date)
            return Response({"result": "Success", "count": len(data), "data": data})
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error fetching occto event: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @swagger_auto_schema(
        operation_summary="Get TDGC Data",
        manual_parameters=[
            openapi.Parameter('start_date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True, description="YYYYMMDD"),
            openapi.Parameter('end_date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True, description="YYYYMMDD"),
            openapi.Parameter('area_name', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=False, description="Area name"),
        ],
        responses={200: TdgcSerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def tdgc(self, request):
        try:
            start_date, end_date = self._validate_dates(request)
            area_name = request.query_params.get('area_name')
            es = ESService()
            data = es.get_tdgc_data(start_date, end_date, area_name)
            return Response({"result": "Success", "count": len(data), "data": data})
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error fetching tdgc: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @swagger_auto_schema(
        operation_summary="Get Weather Actual",
        manual_parameters=[
            openapi.Parameter('start_date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True, description="YYYYMMDD"),
            openapi.Parameter('end_date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True, description="YYYYMMDD"),
            openapi.Parameter('area_name', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=False, description="Area name (en)"),
        ],
        responses={200: WeatherActualSerializer(many=True)}
    )
    @action(detail=False, methods=['get'], url_path='weather-actual')
    def weather_actual(self, request):
        try:
            start_date, end_date = self._validate_dates(request)
            area_name = request.query_params.get('area_name')
            es = ESService()
            data = es.get_weather_actual(start_date, end_date, area_name)
            return Response({"result": "Success", "count": len(data), "data": data})
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error fetching weather actual: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @swagger_auto_schema(
        operation_summary="Get Weather Forecast",
        manual_parameters=[
            openapi.Parameter('start_date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True, description="YYYYMMDD"),
            openapi.Parameter('end_date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True, description="YYYYMMDD"),
            openapi.Parameter('area_name', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=False, description="Area name (en)"),
        ],
        responses={200: WeatherForecastSerializer(many=True)}
    )
    @action(detail=False, methods=['get'], url_path='weather-forecast')
    def weather_forecast(self, request):
        try:
            start_date, end_date = self._validate_dates(request)
            area_name = request.query_params.get('area_name')
            es = ESService()
            data = es.get_weather_forecast(start_date, end_date, area_name)
            return Response({"result": "Success", "count": len(data), "data": data})
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error fetching weather forecast: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
