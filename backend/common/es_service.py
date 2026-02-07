"""
Elasticsearch Service Module.

This module provides the ESService class that serves as the data access layer
for all Elasticsearch queries in the application. It handles market data,
predictions, weather, and other domain-specific data retrieval.

The service abstracts Elasticsearch query complexity and provides a clean
interface for the API views to fetch data.

Example:
    >>> from common.es_service import ESService
    >>> es = ESService()
    >>> predictions = es.get_predictions('20250101', '20250107', area_name='tokyo', model_name='ModelA')
"""

import json
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any

from django.conf import settings
from elasticsearch import Elasticsearch
from elasticsearch_dsl import Search, Q, A

from area.constants import AREA_EN_JP_MAP, AREA_EN_CH_MAP

logger = logging.getLogger(__name__)

# Maximum number of documents to return from ES queries
# ES default is 10000; larger values require scroll API
MAX_ES_RESULTS = 10000


class ESService:
    """
    Elasticsearch service for market data access.

    Provides methods to query various indices in Elasticsearch including
    predictions, JEPX trades, weather data, and grid operation data.

    All date parameters should be in YYYYMMDD string format unless
    otherwise specified.

    Attributes:
        host: Elasticsearch host:port string.
        client: Elasticsearch client instance.
        prediction_index: Name of the prediction index.
        jepx_index: Name of the JEPX spot market index.
        (other indices for various data types)

    Example:
        >>> es = ESService()
        >>> trades = es.get_jepx_trades('20250101', '20250107', area_name='tokyo')
    """

    def __init__(self) -> None:
        """
        Initialize ESService with connection to Elasticsearch.

        Reads configuration from Django settings and establishes
        connection to the Elasticsearch cluster. Also loads index
        names from settings with fallback defaults.

        Raises:
            ConnectionError: If unable to connect to Elasticsearch.
        """
        self.host = f"{settings.ELASTICSEARCH_HOST}:{settings.ELASTICSEARCH_PORT}"
        self.client = Elasticsearch(
            [self.host],
            basic_auth=(settings.ELASTICSEARCH_USERNAME, settings.ELASTICSEARCH_PASSWORD) if settings.ELASTICSEARCH_USERNAME else None,
            request_timeout=60,
            verify_certs=True
        )

        # Load index names from settings with fallback defaults
        es_indices = getattr(settings, 'ELASTICSEARCH_INDICES', {})
        self.prediction_index = es_indices.get('prediction', 'prediction')
        self.jepx_index = es_indices.get('jepx', 'jepx_spot_nightly')
        self.imbalance_index = es_indices.get('imbalance', 'imbalance')
        self.hjks_index = es_indices.get('hjks', 'hjks')
        self.interconnection_index = es_indices.get('interconnection', 'interconnection')
        self.intraday_index = es_indices.get('intraday', 'jepx_intraday')
        self.earthquake_index = es_indices.get('earthquake', 'jma_earthquake_actual')
        self.occto_area_index = es_indices.get('occto_area', 'occto_area')
        self.occto_inter_index = es_indices.get('occto_inter', 'occto_inter')
        self.occto_event_index = es_indices.get('occto_event', 'occto_event')
        self.tdgc_index = es_indices.get('tdgc', 'tdgc')
        self.weather_actual_index = es_indices.get('weather_actual', 'weather_actual')
        self.weather_forecast_index = es_indices.get('weather_forecast', 'weather_forecast')

        # JEPX field name mapping: field suffix in ES -> normalized area code
        # Some ES fields use 'touhoku' but our API uses 'tohoku'
        self.jepx_area_map: Dict[str, str] = {
            'hokkaido': 'hokkaido',
            'touhoku': 'tohoku',  # Note: ES uses 'touhoku', API uses 'tohoku'
            'tokyo': 'tokyo',
            'chubu': 'chubu',
            'hokuriku': 'hokuriku',
            'kansai': 'kansai',
            'chugoku': 'chugoku',
            'shikoku': 'shikoku',
            'kyushu': 'kyushu'
        }
        # Reverse map for JP -> EN area names (from constants)
        self.jp_en_area_map: Dict[str, str] = {v: k for k, v in AREA_EN_JP_MAP.items()}

    def _get_time_code(self, dt_str: str) -> int:
        """
        Calculate time code (1-48) from datetime string.

        JEPX uses 48 time codes per day (30-minute intervals).
        Code 1 = 00:00-00:30, Code 2 = 00:30-01:00, etc.

        Args:
            dt_str: Datetime string in "YYYY-MM-DD HH:MM:SS" format.

        Returns:
            Integer time code from 1 to 48.
        """
        dt = datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S")
        # Formula: hour*2 + (1 if minutes >= 30 else 0) + 1
        return (dt.hour * 2) + (1 if dt.minute >= 30 else 0) + 1

    def _get_trade_date(self, dt_str: str) -> str:
        """
        Extract date portion from datetime string.

        Args:
            dt_str: Datetime string containing date and time.

        Returns:
            Date string in "YYYY-MM-DD" format.
        """
        return dt_str.split(' ')[0]

    def get_predictions(
        self,
        start_date: str,
        end_date: str,
        area_name: Optional[str] = None,
        model_name: Optional[str] = None,
        calculating_date: Optional[str] = None,
        latest_only: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Fetch price predictions from Elasticsearch.

        Queries the prediction index for electricity price predictions
        within the specified date range. Can filter by area, model,
        and calculation date.

        Args:
            start_date: Start date in YYYYMMDD format.
            end_date: End date in YYYYMMDD format.
            area_name: Optional English area name filter (e.g., 'tokyo').
            model_name: Optional model/source name filter.
            calculating_date: Optional specific calculation date (YYYYMMDD).
            latest_only: If True, return only the most recent prediction
                for each (trade_date, time_code, area) combination.

        Returns:
            List of prediction dictionaries containing:
                - id: Unique identifier
                - model_name: Source model name
                - trade_date: Target delivery date
                - time_code: 30-minute interval code (1-48)
                - calculating_date: When prediction was made
                - area_name: English area name
                - price_5, price_50, price_95: Percentile predictions
                - additional_data: Extra model-specific data
        """
        # Convert YYYYMMDD to YYYY-MM-DD for ES query
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")

        s = Search(using=self.client, index=self.prediction_index)

        # Filter by target delivery datetime range
        s = s.filter('range', datetime={'gte': s_date + ' 00:00:00', 'lte': e_date + ' 23:59:59'})

        if area_name:
            # Map English area name to Japanese for ES query
            # ES stores area as Japanese text (e.g., "東京")
            area_jp = AREA_EN_JP_MAP.get(area_name)
            if area_jp:
                s = s.query(Q('match', area=area_jp))

        if model_name:
            s = s.query(Q('match', source=model_name))

        if calculating_date:
            # Filter to specific calculation date
            c_date = datetime.strptime(calculating_date, "%Y%m%d").strftime("%Y-%m-%d")
            s = s.filter('term', calculate_time=c_date)

        s = s.extra(size=MAX_ES_RESULTS)

        response = s.execute()

        results = []
        for hit in response:
            try:
                area_jp = hit.area
                area_en = self.jp_en_area_map.get(area_jp)
                if not area_en:
                    continue

                # Parse additional_data JSON if present
                additional: Dict[str, Any] = {}
                if hasattr(hit, 'additional_data') and hit.additional_data:
                    if isinstance(hit.additional_data, str):
                        try:
                            additional = json.loads(hit.additional_data)
                        except json.JSONDecodeError:
                            pass
                    else:
                        additional = hit.additional_data

                price_5 = additional.get('price_5')
                price_95 = additional.get('price_95')

                time_code = self._get_time_code(hit.datetime)
                trade_date = self._get_trade_date(hit.datetime)

                results.append({
                    "id": hit.md5_id if hasattr(hit, 'md5_id') else f"{trade_date}-{time_code}-{area_en}",
                    "model_name": hit.source,
                    "trade_date": trade_date,
                    "time_code": time_code,
                    "calculating_date": hit.calculate_time,
                    "area_name": area_en,
                    "area_name_ch": AREA_EN_CH_MAP.get(area_en, ""),
                    "area_name_jp": area_jp,
                    "price_5": price_5,
                    "price_50": hit.forecast_price,
                    "price_95": price_95,
                    "additional_data": additional
                })
            except Exception as e:
                logger.error(f"Error parsing prediction hit: {e}")
                continue

        # Post-process to keep only latest prediction per time slot if requested
        if latest_only:
            latest_map: Dict[tuple, Dict[str, Any]] = {}
            for res in results:
                key = (res['trade_date'], res['time_code'], res['area_name'])
                current = latest_map.get(key)
                if not current:
                    latest_map[key] = res
                else:
                    # Keep the prediction with the later calculating_date
                    if str(res['calculating_date']) > str(current['calculating_date']):
                        latest_map[key] = res
            results = list(latest_map.values())

        # Sort by date, time, and area for consistent ordering
        results.sort(key=lambda x: (x['trade_date'], x['time_code'], x['area_name']))

        return results

    def get_available_calculating_dates(
        self,
        start_date: str,
        end_date: str,
        area_name: str,
        model_name: str
    ) -> List[Dict[str, str]]:
        """
        Get unique calculation dates for predictions.

        Returns a list of dates when predictions were calculated,
        allowing users to compare predictions made at different times.

        Args:
            start_date: Start date in YYYYMMDD format.
            end_date: End date in YYYYMMDD format.
            area_name: English area name.
            model_name: Model/source name.

        Returns:
            List of dicts with 'calculating_date' key, sorted descending.
        """
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")

        s = Search(using=self.client, index=self.prediction_index)
        s = s.filter('range', datetime={'gte': s_date + ' 00:00:00', 'lte': e_date + ' 23:59:59'})

        if area_name:
            area_jp = AREA_EN_JP_MAP.get(area_name)
            if area_jp:
                s = s.query(Q('match', area=area_jp))

        if model_name:
            s = s.query(Q('match', source=model_name))

        # Aggregate unique calculate_time values, sorted descending
        s.aggs.bucket('dates', 'terms', field='calculate_time', size=1000, order={'_key': 'desc'})
        s = s.extra(size=0)  # We only need aggregation results

        response = s.execute()

        return [{"calculating_date": bucket.key} for bucket in response.aggregations.dates.buckets]

    def get_available_models(self) -> List[Dict[str, Any]]:
        """
        Get list of unique prediction model sources.

        Queries the prediction index to find all unique source values,
        representing different prediction models.

        Returns:
            List of model metadata dicts with id, name, description, timestamps.
        """
        s = Search(using=self.client, index=self.prediction_index)
        s.aggs.bucket('sources', 'terms', field='source', size=100)
        s = s.extra(size=0)

        try:
            response = s.execute()
        except Exception:
            # Fallback to source.keyword if source field has fielddata disabled
            s = Search(using=self.client, index=self.prediction_index)
            s.aggs.bucket('sources', 'terms', field='source.keyword', size=100)
            s = s.extra(size=0)
            response = s.execute()

        models = []
        for bucket in response.aggregations.sources.buckets:
            models.append({
                "id": bucket.key,
                "name": bucket.key,
                "description": f"Source: {bucket.key}",
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            })
        return models

    def get_jepx_trades(
        self,
        start_date: str,
        end_date: str,
        area_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch JEPX spot market trade data.

        Retrieves trading data including prices and quantities from
        the JEPX spot market for Day-Ahead trading.

        Args:
            start_date: Start date in YYYYMMDD format.
            end_date: End date in YYYYMMDD format.
            area_name: Optional English area name filter. If None, returns
                all areas.

        Returns:
            List of trade dicts with price, quantity, and area information.
        """
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")

        s = Search(using=self.client, index=self.jepx_index)
        s = s.filter('range', trade_date={'gte': s_date, 'lte': e_date})
        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('trade_date', 'time_code')

        response = s.execute()

        results = []
        target_areas = [area_name] if area_name else self.jepx_area_map.values()

        for hit in response:
            try:
                for en_area in target_areas:
                    # Find the JEPX field key for this area
                    # Example: en_area='tohoku' maps to jepx_key='touhoku'
                    jepx_key = None
                    for k, v in self.jepx_area_map.items():
                        if v == en_area:
                            jepx_key = k
                            break

                    if not jepx_key:
                        continue

                    # Access area-specific price field (e.g., eria_price_tokyo)
                    price_field = f"eria_price_{jepx_key}"
                    if not hasattr(hit, price_field):
                        continue

                    price = getattr(hit, price_field)

                    results.append({
                        "id": f"{hit.trade_date}-{hit.time_code}-{en_area}",
                        "trade_date": hit.trade_date,
                        "time_code": hit.time_code,
                        "sell_quantity": hit.sell_quantity,
                        "buy_quantity": hit.buy_quantity,
                        "contract_quantity": hit.contract_quantity,
                        "system_price": hit.system_price,
                        "name": en_area,
                        "name_ch": AREA_EN_CH_MAP.get(en_area, ""),
                        "name_jp": AREA_EN_JP_MAP.get(en_area, ""),
                        "price": price,
                        # Note: Field has typo "aboidable" in source data
                        "avoidable_cost": getattr(hit, f"aboidable_cost_{jepx_key}", 0)
                    })
            except Exception as e:
                logger.error(f"Error parsing jepx hit: {e}")
                continue

        return results

    def get_imbalance_data(self, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        """
        Fetch imbalance data for all areas.

        Args:
            start_date: Start date in YYYYMMDD format.
            end_date: End date in YYYYMMDD format.

        Returns:
            List of imbalance records with values per area.
        """
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")

        s = Search(using=self.client, index=self.imbalance_index)
        s = s.filter('range', datetime={'gte': s_date + ' 00:00:00', 'lte': e_date + ' 23:59:59'})
        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('datetime')

        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_hjks_outages(
        self,
        start_date: str,
        end_date: str,
        area_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch HJKS power plant outage data.

        Args:
            start_date: Start date in YYYYMMDD format.
            end_date: End date in YYYYMMDD format.
            area_name: Optional English area name filter.

        Returns:
            List of outage records.
        """
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")

        s = Search(using=self.client, index=self.hjks_index)
        s = s.filter('range', start_datetime={'gte': s_date + ' 00:00:00', 'lte': e_date + ' 23:59:59'})

        if area_name:
            area_jp = AREA_EN_JP_MAP.get(area_name)
            if area_jp:
                s = s.query(Q('match', area=area_jp))

        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('start_datetime')

        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_interconnection_flows(
        self,
        start_date: str,
        end_date: str,
        line_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch interconnection line flow data.

        Args:
            start_date: Start date in YYYYMMDD format.
            end_date: End date in YYYYMMDD format.
            line_name: Optional interconnection line name filter.

        Returns:
            List of flow records.
        """
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")

        s = Search(using=self.client, index=self.interconnection_index)
        s = s.filter('range', datetime={'gte': s_date + ' 00:00:00', 'lte': e_date + ' 23:59:59'})

        if line_name:
            s = s.query(Q('match', interconnection_name=line_name))

        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('datetime')

        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_intraday_data(self, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        """
        Fetch JEPX intraday market data.

        Args:
            start_date: Start date in YYYYMMDD format.
            end_date: End date in YYYYMMDD format.

        Returns:
            List of intraday trading records with OHLC prices.
        """
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")

        s = Search(using=self.client, index=self.intraday_index)
        s = s.filter('range', datetime={'gte': s_date + ' 00:00:00', 'lte': e_date + ' 23:59:59'})
        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('datetime')

        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_earthquakes(self, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        """
        Fetch earthquake data from JMA.

        Args:
            start_date: Start date in YYYYMMDD format.
            end_date: End date in YYYYMMDD format.

        Returns:
            List of earthquake event records.
        """
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")

        s = Search(using=self.client, index=self.earthquake_index)
        s = s.filter('range', event_datetime={'gte': s_date + 'T00:00:00', 'lte': e_date + 'T23:59:59'})
        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('event_datetime')

        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_occto_area_data(
        self,
        start_date: str,
        end_date: str,
        area_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch OCCTO area supply/demand data.

        Args:
            start_date: Start date in YYYYMMDD format.
            end_date: End date in YYYYMMDD format.
            area_name: Optional English area name filter.

        Returns:
            List of OCCTO area records with generation mix data.
        """
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")

        s = Search(using=self.client, index=self.occto_area_index)
        s = s.filter('range', datetime={'gte': s_date + ' 00:00:00', 'lte': e_date + ' 23:59:59'})

        if area_name:
            area_jp = AREA_EN_JP_MAP.get(area_name)
            if area_jp:
                s = s.query(Q('match', area=area_jp))

        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('datetime')

        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_occto_interconnection(self, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        """
        Fetch OCCTO interconnection data.

        Args:
            start_date: Start date in YYYYMMDD format.
            end_date: End date in YYYYMMDD format.

        Returns:
            List of OCCTO interconnection records.
        """
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")

        s = Search(using=self.client, index=self.occto_inter_index)
        s = s.filter('range', datetime={'gte': s_date + ' 00:00:00', 'lte': e_date + ' 23:59:59'})
        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('datetime')

        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_occto_events(self, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        """
        Fetch OCCTO system event data.

        Args:
            start_date: Start date in YYYYMMDD format.
            end_date: End date in YYYYMMDD format.

        Returns:
            List of OCCTO event records.
        """
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")

        s = Search(using=self.client, index=self.occto_event_index)
        s = s.filter('range', datetime={'gte': s_date + ' 00:00:00', 'lte': e_date + ' 23:59:59'})
        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('datetime')

        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_tdgc_data(
        self,
        start_date: str,
        end_date: str,
        area_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch TDGC (Tertiary Demand/Generation Control) data.

        Args:
            start_date: Start date in YYYYMMDD format.
            end_date: End date in YYYYMMDD format.
            area_name: Optional English area name filter.

        Returns:
            List of TDGC records with pricing and quantity data.
        """
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")

        s = Search(using=self.client, index=self.tdgc_index)
        s = s.filter('range', datetime={'gte': s_date + ' 00:00:00', 'lte': e_date + ' 23:59:59'})

        if area_name:
            area_jp = AREA_EN_JP_MAP.get(area_name)
            if area_jp:
                # Note: TDGC uses 'Area' field (capital A) unlike other indices
                s = s.query(Q('match', Area=area_jp))

        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('datetime')

        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_weather_actual(
        self,
        start_date: str,
        end_date: str,
        area_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch actual (observed) weather data.

        Args:
            start_date: Start date in YYYYMMDD format.
            end_date: End date in YYYYMMDD format.
            area_name: Optional English area/region name filter.

        Returns:
            List of weather observation records.
        """
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")

        s = Search(using=self.client, index=self.weather_actual_index)
        s = s.filter('range', weather_datetime={'gte': s_date + 'T00:00:00', 'lte': e_date + 'T23:59:59'})

        if area_name:
            # Weather uses 'region' field with English names
            s = s.query(Q('match', region=area_name))

        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('weather_datetime')

        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_weather_forecast(
        self,
        start_date: str,
        end_date: str,
        area_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch weather forecast data.

        Args:
            start_date: Start date in YYYYMMDD format.
            end_date: End date in YYYYMMDD format.
            area_name: Optional English area/region name filter.

        Returns:
            List of weather forecast records.
        """
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")

        s = Search(using=self.client, index=self.weather_forecast_index)
        s = s.filter('range', weather_datetime={'gte': s_date + 'T00:00:00', 'lte': e_date + 'T23:59:59'})

        if area_name:
            s = s.query(Q('match', region=area_name))

        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('weather_datetime')

        response = s.execute()
        return [hit.to_dict() for hit in response]
