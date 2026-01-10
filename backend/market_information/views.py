from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
import logging

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
    WeatherForecastSerializer
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
