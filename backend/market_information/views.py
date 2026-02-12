"""
Market Information API Views.

This module provides API endpoints for fetching market information data from
Elasticsearch. It serves as the bridge between the frontend dashboard and
the ES data store for various market data types.

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
    GET /api/market-info/imbalance?start_date=20250101&end_date=20250102
"""

from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
import logging
import datetime
from typing import Tuple, Optional

from market_information.serializers import (
    ImbalanceSerializer,
    HjksOutageSerializer,
    InterconnectionFlowSerializer,
    IntradaySerializer,
    EarthquakeSerializer,
    OcctoAreaSerializer,
    OcctoInterconnectionSerializer,
    OcctoEventSerializer,
    BatteryDataSerializer,
    BidPlanSerializer,
    TdgcSerializer,
    WeatherActualSerializer,
    WeatherForecastSerializer,
    SpotTradeSerializer
)
from common.es_service import ESService

logger = logging.getLogger(__name__)


class MarketInformationViewSet(viewsets.ViewSet):
    """
    ViewSet for Market Information API.

    Provides read-only endpoints for fetching various types of market data
    from Elasticsearch. All endpoints require authentication and accept
    date range parameters in YYYYMMDD format.

    Attributes:
        permission_classes: Tuple of permission classes requiring authentication.

    Example:
        >>> # Fetch spot market trades for Hokkaido region
        >>> GET /api/market-info/spot-market-trades?start_date=20250101&end_date=20250102&name=hokkaido
    """

    permission_classes = (IsAuthenticated,)

    def _validate_dates(self, request) -> Tuple[str, str]:
        """
        Extract and validate date parameters from request.

        Args:
            request: The DRF request object containing query parameters.

        Returns:
            Tuple containing (start_date, end_date) as strings in YYYYMMDD format.

        Raises:
            ValueError: If start_date or end_date is missing.
        """
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        if not start_date or not end_date:
            raise ValueError("start_date and end_date are required (YYYYMMDD)")
        return start_date, end_date

    def validate_date_param(self, date_str: Optional[str], param_name: str) -> datetime.date:
        """
        Validate a single date parameter and convert to date object.

        Args:
            date_str: Date string in YYYYMMDD format, or None.
            param_name: Name of the parameter (for error messages).

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
        operation_summary="獲取現貨市場交易資料",
        manual_parameters=[
            openapi.Parameter('start_date', openapi.IN_QUERY, description="開始日期 (YYYYMMDD)", type=openapi.TYPE_STRING, required=True),
            openapi.Parameter('end_date', openapi.IN_QUERY, description="結束日期 (YYYYMMDD)", type=openapi.TYPE_STRING, required=True),
            openapi.Parameter('name', openapi.IN_QUERY, description="電力區域名稱", type=openapi.TYPE_STRING, required=False),
        ],
        responses={200: SpotTradeSerializer(many=True)}
    )
    @action(detail=False, methods=['get'], url_path='spot-market-trades')
    def spot_market_trades(self, request) -> Response:
        """
        Retrieve spot market trade data from JEPX.

        Fetches spot market trading data for the specified date range and
        optionally filtered by area. Returns price, quantity, and other
        trading metrics.

        Args:
            request: DRF request with query params:
                - start_date (str): Start date in YYYYMMDD format.
                - end_date (str): End date in YYYYMMDD format.
                - name (str, optional): Area name filter (e.g., 'hokkaido').

        Returns:
            Response with trade data including system price, area price,
            and contract quantities.
        """
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
    def spot_market_area_prices(self, request) -> Response:
        """
        Retrieve area-specific spot market prices.

        Similar to spot_market_trades but focused on area price data.
        When no area is specified, returns prices for all areas, enabling
        cross-area price comparison.

        Args:
            request: DRF request with query params:
                - start_date (str): Start date in YYYYMMDD format.
                - end_date (str): End date in YYYYMMDD format.
                - name (str, optional): Area name filter. If omitted, returns all areas.

        Returns:
            Response with area price data per time slot.
        """
        try:
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            area_name = request.query_params.get('name')

            self.validate_date_param(start_date, 'start_date')
            self.validate_date_param(end_date, 'end_date')

            # Note: area_name is optional - None means all areas will be returned
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
            logger.error(f"Error fetching area prices: {e}")
            return Response({"result": [{"Message": "Error", "Detail": str(e)}], "code": 1}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @swagger_auto_schema(
        operation_summary="Get Imbalance Data",
        manual_parameters=[
            openapi.Parameter('start_date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True, description="YYYYMMDD"),
            openapi.Parameter('end_date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True, description="YYYYMMDD"),
            openapi.Parameter('area_name', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=False, description="Area name (optional)"),
        ],
        responses={200: ImbalanceSerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def imbalance(self, request) -> Response:
        """
        Retrieve imbalance data.

        Imbalance data shows the difference between planned and actual
        power generation/consumption.

        Args:
            request: DRF request with start_date, end_date, and optional area_name query params.

        Returns:
            Response with imbalance values.
        """
        try:
            start_date, end_date = self._validate_dates(request)
            area_name = request.query_params.get('area_name')
            es = ESService()
            data = es.get_imbalance_data(start_date, end_date, area_name)
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
    def hjks(self, request) -> Response:
        """
        Retrieve HJKS power plant outage information.

        HJKS (発電計画・実績・停止) data includes planned and unplanned
        power plant outages that may affect electricity supply.

        Args:
            request: DRF request with query params:
                - start_date (str): Start date in YYYYMMDD format.
                - end_date (str): End date in YYYYMMDD format.
                - area_name (str, optional): Filter by area (e.g., 'hokkaido').

        Returns:
            Response with outage details including plant info and duration.
        """
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
            openapi.Parameter('interval_minutes', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, required=False, description="Downsample to one point per N minutes (e.g. 30 for half-hour). Omit for raw 5-min data."),
        ],
        responses={200: InterconnectionFlowSerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def interconnection(self, request) -> Response:
        """
        Retrieve interconnection line flow data.

        Shows power flow between different grid areas through
        interconnection transmission lines.

        Args:
            request: DRF request with query params:
                - start_date (str): Start date in YYYYMMDD format.
                - end_date (str): End date in YYYYMMDD format.
                - line_name (str, optional): Filter by specific interconnection line.
                - interval_minutes (int, optional): Downsample to one record per N minutes (e.g. 30). Omit for raw data.

        Returns:
            Response with flow data including capacity and margins.
        """
        try:
            start_date, end_date = self._validate_dates(request)
            line_name = request.query_params.get('line_name')
            interval_minutes = request.query_params.get('interval_minutes')
            if interval_minutes is not None:
                try:
                    interval_minutes = int(interval_minutes)
                except (ValueError, TypeError):
                    interval_minutes = None
            es = ESService()
            data = es.get_interconnection_flows(start_date, end_date, line_name, interval_minutes)
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
    def intraday(self, request) -> Response:
        """
        Retrieve JEPX intraday market trading data.

        Intraday market data shows real-time trading prices and volumes
        for same-day electricity delivery.

        Args:
            request: DRF request with start_date and end_date query params.

        Returns:
            Response with OHLC price data and volume information.
        """
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
    def earthquakes(self, request) -> Response:
        """
        Retrieve earthquake event data.

        Earthquake data from JMA (Japan Meteorological Agency) that may
        impact power grid operations and electricity prices.

        Args:
            request: DRF request with start_date and end_date query params.

        Returns:
            Response with earthquake details including magnitude and location.
        """
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
    def occto_area(self, request) -> Response:
        """
        Retrieve OCCTO area supply/demand data.

        OCCTO (Organization for Cross-regional Coordination of Transmission
        Operators) provides data about power generation mix and demand
        per grid area.

        Args:
            request: DRF request with query params:
                - start_date (str): Start date in YYYYMMDD format.
                - end_date (str): End date in YYYYMMDD format.
                - area_name (str, optional): Filter by area.

        Returns:
            Response with generation by source type and total demand.
        """
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
            openapi.Parameter('interval_minutes', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, required=False, description="Downsample to one point per N minutes (e.g. 30). Omit for raw 5-min data."),
        ],
        responses={200: OcctoInterconnectionSerializer(many=True)}
    )
    @action(detail=False, methods=['get'], url_path='occto-inter')
    def occto_inter(self, request) -> Response:
        """
        Retrieve OCCTO interconnection data.

        Detailed interconnection line data from OCCTO including
        operating capacity and wide-area adjustment capacity.

        Args:
            request: DRF request with start_date, end_date, and optional interval_minutes.

        Returns:
            Response with interconnection capacity and flow data.
        """
        try:
            start_date, end_date = self._validate_dates(request)
            interval_minutes = request.query_params.get('interval_minutes')
            if interval_minutes is not None:
                try:
                    interval_minutes = int(interval_minutes)
                except (ValueError, TypeError):
                    interval_minutes = None
            es = ESService()
            data = es.get_occto_interconnection(start_date, end_date, interval_minutes)
            return Response({"result": "Success", "count": len(data), "data": data})
        except ValueError as e:
            # Bug fix: Changed from HTTP_500 to HTTP_400 for client validation errors
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
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
    def occto_event(self, request) -> Response:
        """
        Retrieve OCCTO system event data.

        System events from OCCTO that may affect grid operations,
        such as emergency dispatch or demand response activations.

        Args:
            request: DRF request with start_date and end_date query params.

        Returns:
            Response with event descriptions and affected values.
        """
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
        operation_summary="Get Battery Data",
        manual_parameters=[
            openapi.Parameter('start_date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True, description="YYYYMMDD"),
            openapi.Parameter('end_date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True, description="YYYYMMDD"),
            openapi.Parameter('site_id', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=False, description="Site ID (e.g. Helios)"),
        ],
        responses={200: BatteryDataSerializer(many=True)}
    )
    @action(detail=False, methods=['get'], url_path='battery-data')
    def battery_data(self, request) -> Response:
        """
        Retrieve battery data (eflow).

        Spot/intraday/primary values, SOC, charge/discharge volumes.
        Negative values = charge, positive = discharge.
        """
        try:
            start_date, end_date = self._validate_dates(request)
            site_id = request.query_params.get('site_id')
            es = ESService()
            data = es.get_battery_data(start_date, end_date, site_id)
            return Response({"result": "Success", "count": len(data), "data": data})
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error fetching battery data: {e}")
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
    def tdgc(self, request) -> Response:
        """
        Retrieve TDGC (Tertiary Demand and Generation Control) data.

        TDGC data shows real-time balancing market information
        including reserve requirements and contracted quantities.

        Args:
            request: DRF request with query params:
                - start_date (str): Start date in YYYYMMDD format.
                - end_date (str): End date in YYYYMMDD format.
                - area_name (str, optional): Filter by area.

        Returns:
            Response with TDGC pricing and quantity data.
        """
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
    def weather_actual(self, request) -> Response:
        """
        Retrieve actual (observed) weather data.

        Historical weather observations that can be correlated with
        electricity demand and renewable generation output.

        Args:
            request: DRF request with query params:
                - start_date (str): Start date in YYYYMMDD format.
                - end_date (str): End date in YYYYMMDD format.
                - area_name (str, optional): Filter by area (English name).

        Returns:
            Response with weather metrics including temperature, wind, etc.
        """
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
    def weather_forecast(self, request) -> Response:
        """
        Retrieve weather forecast data.

        Predicted weather data used for electricity demand forecasting
        and renewable generation predictions.

        Args:
            request: DRF request with query params:
                - start_date (str): Start date in YYYYMMDD format.
                - end_date (str): End date in YYYYMMDD format.
                - area_name (str, optional): Filter by area (English name).

        Returns:
            Response with forecasted weather metrics.
        """
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

    @swagger_auto_schema(
        operation_summary="Get Bid Plans",
        manual_parameters=[
            openapi.Parameter('start_date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True, description="YYYYMMDD"),
            openapi.Parameter('end_date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True, description="YYYYMMDD"),
            openapi.Parameter('site_id', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=False, description="Site ID"),
            openapi.Parameter('commodity_category', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=False, description="Commodity category (default: spot)"),
        ],
        responses={200: BidPlanSerializer(many=True)}
    )
    @action(detail=False, methods=['get'], url_path='bid-plans')
    def bid_plans(self, request) -> Response:
        """
        Retrieve bid plan data.

        Bid prices and volumes for spot/intraday commodities.
        """
        try:
            start_date, end_date = self._validate_dates(request)
            site_id = request.query_params.get('site_id')
            commodity_category = request.query_params.get('commodity_category', None)
            es = ESService()
            data = es.get_bid_plans(start_date, end_date, site_id, commodity_category)
            return Response({"result": "Success", "count": len(data), "data": data})
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error fetching bid plans: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
