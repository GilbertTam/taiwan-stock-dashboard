import json
import logging
from datetime import datetime, timedelta
from django.conf import settings
from elasticsearch import Elasticsearch
from elasticsearch_dsl import Search, Q, A

from area.constants import AREA_EN_JP_MAP, AREA_EN_CH_MAP

logger = logging.getLogger(__name__)

class ESService:
    def __init__(self):

        self.host = f"{settings.ELASTICSEARCH_HOST}:{settings.ELASTICSEARCH_PORT}"
        self.client = Elasticsearch(
            [self.host],
            basic_auth=(settings.ELASTICSEARCH_USERNAME, settings.ELASTICSEARCH_PASSWORD) if settings.ELASTICSEARCH_USERNAME else None,
            request_timeout=60,
            verify_certs=True
        )
        # Load index names from settings
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


        # JEPX field name mapping to area codes
        self.jepx_area_map = {
            'hokkaido': 'hokkaido',
            'touhoku': 'tohoku',
            'tokyo': 'tokyo',
            'chubu': 'chubu',
            'hokuriku': 'hokuriku',
            'kansai': 'kansai',
            'chugoku': 'chugoku',
            'shikoku': 'shikoku',
            'kyushu': 'kyushu'
        }
        # Reverse map for JP -> EN area names
        self.jp_en_area_map = {v: k for k, v in AREA_EN_JP_MAP.items()}

    def _get_time_code(self, dt_str):
        """Calculate time code (1-48) from datetime string"""
        # Assuming dt_str is "YYYY-MM-DD HH:MM:SS"
        dt = datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S")
        # 00:00 is code 1, 00:30 is code 2, ..., 23:30 is code 48
        return (dt.hour * 2) + (1 if dt.minute >= 30 else 0) + 1

    def _get_trade_date(self, dt_str):
        """Get date string from datetime string"""
        return dt_str.split(' ')[0]

    def get_predictions(self, start_date, end_date, area_name=None, model_name=None, calculating_date=None, latest_only=True):
        """
        Fetch predictions from ES.
        
        Args:
            start_date (str): YYYYMMDD
            end_date (str): YYYYMMDD
            area_name (str, optional): EN area name
            model_name (str, optional): Source
            calculating_date (str, optional): YYYYMMDD
            latest_only (bool): If True, return only the latest calculation for each target time
        """
        # Convert YYYYMMDD to YYYY-MM-DD
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")
        # Add one day to end_date for range query if needed, or just string compare
        
        s = Search(using=self.client, index=self.prediction_index)
        
        # Filter by date range (target datetime)
        # datetime field is "YYYY-MM-DD HH:MM:SS"
        # Fix: format dates to match the field format expected by ES
        # Also, because 'datetime' is the target delivery time (e.g. 2026-01-11), 
        # but the query is typically asking for predictions FOR a certain period.
        # If the user asks for predictions for 20260111, start_date=20260111, end_date=20260111.
        # We should filter 'datetime' (target time) by this range.
        s = s.filter('range', datetime={'gte': s_date + ' 00:00:00', 'lte': e_date + ' 23:59:59'})
        
        if area_name:
            # Map EN area to JP area for query
            # Note: The 'area' field in ES prediction index is stored as Japanese name (e.g. "東京")
            area_jp = AREA_EN_JP_MAP.get(area_name)
            if area_jp:
                # Use match query which is broader
                s = s.query(Q('match', area=area_jp))
        
        if model_name:
            # Use match query
            s = s.query(Q('match', source=model_name))
            
        if calculating_date:
            # calculating_date param is YYYYMMDD, ES field is YYYY-MM-DD
            c_date = datetime.strptime(calculating_date, "%Y%m%d").strftime("%Y-%m-%d")
            s = s.filter('term', calculate_time=c_date)
            
        # Pagination - set a large limit for now
        s = s.extra(size=10000)
        
        response = s.execute()
        
        results = []
        for hit in response:
            try:
                area_jp = hit.area
                area_en = self.jp_en_area_map.get(area_jp)
                if not area_en:
                    continue
                
                # Parse additional data
                additional = {}
                if hasattr(hit, 'additional_data') and hit.additional_data:
                    if isinstance(hit.additional_data, str):
                        try:
                            additional = json.loads(hit.additional_data)
                        except:
                            pass
                    else:
                        additional = hit.additional_data

                # Helper to safe get
                price_5 = additional.get('price_5')
                price_95 = additional.get('price_95')
                
                # Construct result
                # Note: ES "datetime" is target delivery time
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

        # If latest_only is True, we need to filter in python because ES grouping is complex
        if latest_only:
            latest_map = {} # Key: (trade_date, time_code, area_name) -> result
            for res in results:
                key = (res['trade_date'], res['time_code'], res['area_name'])
                current = latest_map.get(key)
                if not current:
                    latest_map[key] = res
                else:
                    # Compare calculating_date
                    curr_calc = current['calculating_date']
                    new_calc = res['calculating_date']
                    # Ensure both are strings or comparable before comparison
                    if str(new_calc) > str(curr_calc):
                        latest_map[key] = res
            results = list(latest_map.values())
            
        # Sort
        results.sort(key=lambda x: (x['trade_date'], x['time_code'], x['area_name']))
        
        return results

    def get_available_calculating_dates(self, start_date, end_date, area_name, model_name):
        """Get unique calculate_time values"""
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")
        
        s = Search(using=self.client, index=self.prediction_index)
        # Fix: format dates to match the field format expected by ES
        s = s.filter('range', datetime={'gte': s_date + ' 00:00:00', 'lte': e_date + ' 23:59:59'})
        
        if area_name:
            area_jp = AREA_EN_JP_MAP.get(area_name)
            if area_jp:
                s = s.query(Q('match', area=area_jp))
        
        if model_name:
            s = s.query(Q('match', source=model_name))
            
        # Aggregation
        s.aggs.bucket('dates', 'terms', field='calculate_time', size=1000, order={'_key': 'desc'})
        s = s.extra(size=0)
        
        response = s.execute()
        
        return [{"calculating_date": bucket.key} for bucket in response.aggregations.dates.buckets]

    def get_available_models(self):
        """Get unique sources"""
        s = Search(using=self.client, index=self.prediction_index)
        # Try aggregating on 'source' field directly. 
        # If it's text, this might fail with fielddata error, but if 'source.keyword' failed to find anything, 
        # it's likely mapped as keyword or doesn't have the subfield.
        s.aggs.bucket('sources', 'terms', field='source', size=100)
        s = s.extra(size=0)
        
        try:
            response = s.execute()
        except Exception:
            # Fallback to source.keyword if source failed (e.g. fielddata disabled)
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

    def get_jepx_trades(self, start_date, end_date, area_name=None):
        """
        Fetch JEPX trades.
        
        Args:
            start_date (str): YYYYMMDD
            end_date (str): YYYYMMDD
            area_name (str, optional): EN area name
        """
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")
        
        s = Search(using=self.client, index=self.jepx_index)
        s = s.filter('range', trade_date={'gte': s_date, 'lte': e_date})
        s = s.extra(size=10000)
        s = s.sort('trade_date', 'time_code')
        
        response = s.execute()
        
        results = []
        target_areas = [area_name] if area_name else self.jepx_area_map.values()
        
        for hit in response:
            try:
                # hit is one time slot for all areas
                for en_area in target_areas:
                    # Find the key in jepx_area_map that maps to this en_area
                    # e.g. en_area='tohoku', we look for key='touhoku'
                    jepx_key = None
                    for k, v in self.jepx_area_map.items():
                        if v == en_area:
                            jepx_key = k
                            break
                    
                    if not jepx_key:
                        continue
                        
                    price_field = f"eria_price_{jepx_key}"
                    if not hasattr(hit, price_field):
                        continue
                        
                    price = getattr(hit, price_field)
                    
                    # Construct result similar to SQL join
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
                        "avoidable_cost": getattr(hit, f"aboidable_cost_{jepx_key}", 0) # Note typo in sample "aboidable"
                    })
            except Exception as e:
                logger.error(f"Error parsing jepx hit: {e}")
                continue
                
        return results

    def get_imbalance_data(self, start_date, end_date):
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")
        
        s = Search(using=self.client, index=self.imbalance_index)
        s = s.filter('range', datetime={'gte': s_date + ' 00:00:00', 'lte': e_date + ' 23:59:59'})
        s = s.extra(size=10000)
        s = s.sort('datetime')
        
        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_hjks_outages(self, start_date, end_date, area_name=None):
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")
        
        s = Search(using=self.client, index=self.hjks_index)
        s = s.filter('range', start_datetime={'gte': s_date + ' 00:00:00', 'lte': e_date + ' 23:59:59'})
        
        if area_name:
            area_jp = AREA_EN_JP_MAP.get(area_name)
            if area_jp:
                s = s.query(Q('match', area=area_jp))
                
        s = s.extra(size=10000)
        s = s.sort('start_datetime')
        
        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_interconnection_flows(self, start_date, end_date, line_name=None):
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")
        
        s = Search(using=self.client, index=self.interconnection_index)
        s = s.filter('range', datetime={'gte': s_date + ' 00:00:00', 'lte': e_date + ' 23:59:59'})
        
        if line_name:
            s = s.query(Q('match', interconnection_name=line_name))
            
        s = s.extra(size=10000)
        s = s.sort('datetime')
        
        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_intraday_data(self, start_date, end_date):
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")
        
        s = Search(using=self.client, index=self.intraday_index)
        s = s.filter('range', datetime={'gte': s_date + ' 00:00:00', 'lte': e_date + ' 23:59:59'})
        s = s.extra(size=10000)
        s = s.sort('datetime')
        
        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_earthquakes(self, start_date, end_date):
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")
        
        s = Search(using=self.client, index=self.earthquake_index)
        s = s.filter('range', event_datetime={'gte': s_date + 'T00:00:00', 'lte': e_date + 'T23:59:59'})
        s = s.extra(size=10000)
        s = s.sort('event_datetime')
        
        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_occto_area_data(self, start_date, end_date, area_name=None):
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")
        
        s = Search(using=self.client, index=self.occto_area_index)
        s = s.filter('range', datetime={'gte': s_date + ' 00:00:00', 'lte': e_date + ' 23:59:59'})
        
        if area_name:
            area_jp = AREA_EN_JP_MAP.get(area_name)
            if area_jp:
                s = s.query(Q('match', area=area_jp))
                
        s = s.extra(size=10000)
        s = s.sort('datetime')
        
        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_occto_interconnection(self, start_date, end_date):
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")
        
        s = Search(using=self.client, index=self.occto_inter_index)
        s = s.filter('range', datetime={'gte': s_date + ' 00:00:00', 'lte': e_date + ' 23:59:59'})
        s = s.extra(size=10000)
        s = s.sort('datetime')
        
        response = s.execute()
        return [hit.to_dict() for hit in response]
    
    def get_occto_events(self, start_date, end_date):
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")
        
        s = Search(using=self.client, index=self.occto_event_index)
        s = s.filter('range', datetime={'gte': s_date + ' 00:00:00', 'lte': e_date + ' 23:59:59'})
        s = s.extra(size=10000)
        s = s.sort('datetime')
        
        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_tdgc_data(self, start_date, end_date, area_name=None):
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")
        
        s = Search(using=self.client, index=self.tdgc_index)
        s = s.filter('range', datetime={'gte': s_date + ' 00:00:00', 'lte': e_date + ' 23:59:59'})
        
        if area_name:
            area_jp = AREA_EN_JP_MAP.get(area_name)
            if area_jp:
                s = s.query(Q('match', Area=area_jp))
        
        s = s.extra(size=10000)
        s = s.sort('datetime')
        
        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_weather_actual(self, start_date, end_date, area_name=None):
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")
        
        s = Search(using=self.client, index=self.weather_actual_index)
        s = s.filter('range', weather_datetime={'gte': s_date + 'T00:00:00', 'lte': e_date + 'T23:59:59'})
        
        if area_name:
            s = s.query(Q('match', region=area_name))
            
        s = s.extra(size=10000)
        s = s.sort('weather_datetime')
        
        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_weather_forecast(self, start_date, end_date, area_name=None):
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")
        
        s = Search(using=self.client, index=self.weather_forecast_index)
        s = s.filter('range', weather_datetime={'gte': s_date + 'T00:00:00', 'lte': e_date + 'T23:59:59'})
        
        if area_name:
             s = s.query(Q('match', region=area_name))
             
        s = s.extra(size=10000)
        s = s.sort('weather_datetime')
        
        response = s.execute()
        return [hit.to_dict() for hit in response]
