import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from elasticsearch import Elasticsearch
from elasticsearch_dsl import Search, Q
from app.config import settings
from app.core.logging import logger
from app.core.constants import AREA_EN_JP_MAP, AREA_EN_CH_MAP

MAX_ES_RESULTS = 10000

def _downsample_by_interval(
    rows: List[Dict[str, Any]],
    interval_minutes: int,
    datetime_key: str = 'datetime',
    line_key: Optional[str] = 'interconnection_name',
) -> List[Dict[str, Any]]:
    if not rows or interval_minutes <= 0:
        return rows
    seen: set = set()
    out: List[Dict[str, Any]] = []
    fmt = '%Y-%m-%d %H:%M:%S'
    for rec in rows:
        dt_str = rec.get(datetime_key)
        if not dt_str:
            out.append(rec)
            continue
        try:
            dt = datetime.strptime(str(dt_str).replace('T', ' ')[:19], fmt)
        except (ValueError, TypeError):
             # Try iso format if basic parsing fails
            try:
                dt = datetime.fromisoformat(str(dt_str))
            except:
                out.append(rec)
                continue
                
        total_mins = dt.hour * 60 + dt.minute
        bucket_mins = (total_mins // interval_minutes) * interval_minutes
        bucket_dt = dt.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(minutes=bucket_mins)
        line = rec.get(line_key) or ''
        key = (bucket_dt, line)
        if key in seen:
            continue
        seen.add(key)
        out.append(rec)
    return out

class ESService:
    def __init__(self) -> None:
        self.host = f"{settings.ELASTICSEARCH_HOST}:{settings.ELASTICSEARCH_PORT}"
        self.client = Elasticsearch(
            [self.host],
            basic_auth=(settings.ELASTICSEARCH_USERNAME, settings.ELASTICSEARCH_PASSWORD) if settings.ELASTICSEARCH_USERNAME else None,
            request_timeout=60,
            verify_certs=True,
            max_retries=3,
            retry_on_timeout=True,
        )
        
        indices = settings.ELASTICSEARCH_INDICES
        self.prediction_index = indices['prediction']
        self.jepx_index = indices['jepx']
        self.jepx_system_index = indices['jepx_system']
        self.imbalance_index = indices['imbalance']
        self.hjks_index = indices['hjks']
        self.interconnection_index = indices['interconnection']
        self.intraday_index = indices['intraday']
        self.earthquake_index = indices['earthquake']
        self.occto_area_index = indices['occto_area']
        self.occto_inter_index = indices['occto_inter']
        self.occto_event_index = indices['occto_event']
        self.tdgc_index = indices['tdgc']
        self.weather_actual_index = indices['weather_actual']
        self.weather_actual_daily_index = indices.get('weather_actual_daily', 'weather_actual_daily')
        self.weather_forecast_index = indices['weather_forecast']
        self.weather_forecast_daily_index = indices.get('weather_forecast_daily', 'weather_forecast_daily')
        self.battery_data_index = indices['battery_data']
        self.bid_plans_index = indices['bid_plans']

    def _get_time_code(self, dt_str: str) -> int:
        if isinstance(dt_str, datetime):
            dt = dt_str
        else:
            s = str(dt_str).replace('T', ' ')[:19]
            dt = datetime.strptime(s, "%Y-%m-%d %H:%M:%S")
        return (dt.hour * 2) + (1 if dt.minute >= 30 else 0) + 1

    def _get_trade_date(self, dt_str: str) -> str:
        s = str(dt_str)
        if 'T' in s:
            return s.split('T')[0][:10]
        return s.split(' ')[0][:10]

    def get_predictions(
        self,
        start_date: str,
        end_date: str,
        area_name: Optional[str] = None,
        model_name: Optional[str] = None,
        calculating_date: Optional[str] = None,
        latest_only: bool = True
    ) -> List[Dict[str, Any]]:
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")

        s = Search(using=self.client, index=self.prediction_index)
        s = s.filter('range', datetime={'gte': s_date + 'T00:00:00', 'lte': e_date + 'T23:59:59'})

        if area_name:
            s = s.filter('term', area=area_name)

        if model_name:
            s = s.query(Q('match', source=model_name))

        if calculating_date:
            c_date = datetime.strptime(calculating_date, "%Y%m%d").strftime("%Y-%m-%d")
            s = s.filter('term', calculate_time=c_date)

        s = s.extra(size=MAX_ES_RESULTS)
        response = s.execute()

        results = []
        for hit in response:
            try:
                area_en = hit.area
                if not area_en:
                    continue

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
                    "area_name_jp": AREA_EN_JP_MAP.get(area_en, ""),
                    "price_5": price_5,
                    "price_50": float(hit.forecast_price) if hasattr(hit, 'forecast_price') else 0.0,
                    "price_95": price_95,
                    "additional_data": additional
                })
            except Exception as e:
                logger.error(f"Error parsing prediction hit: {e}")
                continue

        if latest_only:
            latest_map: Dict[tuple, Dict[str, Any]] = {}
            for res in results:
                key = (res['trade_date'], res['time_code'], res['area_name'])
                current = latest_map.get(key)
                if not current:
                    latest_map[key] = res
                else:
                    if str(res['calculating_date']) > str(current['calculating_date']):
                        latest_map[key] = res
            results = list(latest_map.values())

        results.sort(key=lambda x: (x['trade_date'], x['time_code'], x['area_name']))
        return results

    def get_jepx_trades(
        self,
        start_date: str,
        end_date: str,
        area_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")
        range_gte = s_date + ' 00:00:00'
        range_lte = e_date + ' 23:59:59'

        s = Search(using=self.client, index=self.jepx_index)
        s = s.filter('range', **{'event_time': {'gte': range_gte, 'lte': range_lte}})
        
        if area_name:
            s = s.filter('term', area=area_name)
            
        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('event_time')

        response = s.execute()

        results = []
        for hit in response:
            try:
                area_en = hit.area
                event_time_str = hit.event_time
                time_code = self._get_time_code(event_time_str)
                trade_date = self._get_trade_date(event_time_str)

                results.append({
                    "id": f"{trade_date}-{time_code}-{area_en}",
                    "trade_date": trade_date,
                    "time_code": time_code,
                    "name": area_en,
                    "name_ch": AREA_EN_CH_MAP.get(area_en, ""),
                    "name_jp": AREA_EN_JP_MAP.get(area_en, ""),
                    "price": hit.area_price,
                    "sell_quantity": getattr(hit, 'sell_quantity', 0),
                    "buy_quantity": getattr(hit, 'buy_quantity', 0),
                    "contract_quantity": getattr(hit, 'contract_quantity', 0),
                    "system_price": getattr(hit, 'system_price', 0),
                    "avoidable_cost": getattr(hit, 'avoidable_cost', 0)
                })
            except Exception as e:
                logger.error(f"Error parsing jepx hit: {e}")
                continue

        return results

    def get_imbalance_data(self, start_date: str, end_date: str, area_name: Optional[str] = None) -> List[Dict[str, Any]]:
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")

        s = Search(using=self.client, index=self.imbalance_index)
        s = s.filter('range', **{'datetime': {'gte': s_date + ' 00:00:00', 'lte': e_date + ' 23:59:59'}})

        if area_name:
             s = s.filter('term', area=area_name)

        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('datetime')
        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_hjks_outages(self, start_date: str, end_date: str, area_name: Optional[str] = None) -> List[Dict[str, Any]]:
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")

        s = Search(using=self.client, index=self.hjks_index)
        s = s.filter('range', **{'start_datetime.keyword': {'gte': s_date + ' 00:00:00', 'lte': e_date + ' 23:59:59'}})

        if area_name:
            s = s.filter('term', area=area_name)

        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('start_datetime.keyword')
        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_interconnection_flows(self, start_date: str, end_date: str, line_name: Optional[str] = None, interval_minutes: Optional[int] = None) -> List[Dict[str, Any]]:
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")

        s = Search(using=self.client, index=self.interconnection_index)
        s = s.filter('range', **{'datetime': {'gte': s_date + ' 00:00:00', 'lte': e_date + ' 23:59:59'}})

        if line_name:
            s = s.query(Q('match', interconnection_name=line_name))

        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('datetime')
        response = s.execute()
        rows = [hit.to_dict() for hit in response]
        if interval_minutes and interval_minutes > 0:
            rows = _downsample_by_interval(rows, interval_minutes, datetime_key='datetime', line_key='interconnection_name')
        return rows

    def get_intraday_data(self, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")

        s = Search(using=self.client, index=self.intraday_index)
        s = s.filter('range', **{'datetime': {'gte': s_date + ' 00:00:00', 'lte': e_date + ' 23:59:59'}})
        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('datetime')
        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_jepx_system_data(self, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        """Query JEPX system-level price and bid/ask volume data."""
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")
        range_gte = s_date + ' 00:00:00'
        range_lte = e_date + ' 23:59:59'

        s = Search(using=self.client, index=self.jepx_system_index)
        s = s.filter('range', **{'event_time': {'gte': range_gte, 'lte': range_lte}})
        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('event_time')
        response = s.execute()

        results = []
        for hit in response:
            try:
                event_time_str = hit.event_time
                time_code = self._get_time_code(event_time_str)
                trade_date = self._get_trade_date(event_time_str)
                results.append({
                    "trade_date": trade_date,
                    "time_code": time_code,
                    "datetime": event_time_str,
                    "system_price": float(getattr(hit, 'system_price', 0) or 0),
                    "sell_quantity": float(getattr(hit, 'sell_quantity', 0) or 0),
                    "buy_quantity": float(getattr(hit, 'buy_quantity', 0) or 0),
                    "contract_quantity": float(getattr(hit, 'contract_quantity', 0) or 0),
                    "avoidable_cost": float(getattr(hit, 'avoidable_cost', 0) or 0),
                })
            except Exception as e:
                logger.error(f"Error parsing jepx system hit: {e}")
                continue
        return results

    def get_earthquakes(self, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")

        s = Search(using=self.client, index=self.earthquake_index)
        s = s.filter('range', event_datetime={'gte': s_date + 'T00:00:00', 'lte': e_date + 'T23:59:59'})
        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('event_datetime')
        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_occto_area_data(self, start_date: str, end_date: str, area_name: Optional[str] = None) -> List[Dict[str, Any]]:
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")

        s = Search(using=self.client, index=self.occto_area_index)
        s = s.filter('range', **{'datetime': {'gte': s_date + ' 00:00:00', 'lte': e_date + ' 23:59:59'}})
        if area_name:
            s = s.filter('term', area=area_name)
        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('datetime')
        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_occto_interconnection(self, start_date: str, end_date: str, interval_minutes: Optional[int] = None) -> List[Dict[str, Any]]:
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")

        s = Search(using=self.client, index=self.occto_inter_index)
        s = s.filter('range', **{'datetime': {'gte': s_date + ' 00:00:00', 'lte': e_date + ' 23:59:59'}})
        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('datetime')
        response = s.execute()
        rows = [hit.to_dict() for hit in response]
        if interval_minutes and interval_minutes > 0:
            rows = _downsample_by_interval(rows, interval_minutes, datetime_key='datetime', line_key='interconnection_name')
        return rows

    def get_battery_data(self, start_date: str, end_date: str, site_id: Optional[str] = None) -> List[Dict[str, Any]]:
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")
        s = Search(using=self.client, index=self.battery_data_index)
        s = s.filter('range', **{'event_time': {'gte': s_date + 'T00:00:00', 'lte': e_date + 'T23:59:59'}})
        if site_id:
            s = s.filter('term', site_id=site_id)
        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('event_time')
        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_occto_events(self, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")
        s = Search(using=self.client, index=self.occto_event_index)
        s = s.filter('range', **{'datetime': {'gte': s_date + ' 00:00:00', 'lte': e_date + ' 23:59:59'}})
        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('datetime')
        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_tdgc_data(self, start_date: str, end_date: str, area_name: Optional[str] = None) -> List[Dict[str, Any]]:
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")
        s = Search(using=self.client, index=self.tdgc_index)
        s = s.filter('range', **{'datetime': {'gte': s_date + ' 00:00:00', 'lte': e_date + ' 23:59:59'}})
        if area_name:
            s = s.query(Q('match', Area=area_name))
        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('datetime')
        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_weather_actual(self, start_date: str, end_date: str, area_name: Optional[str] = None) -> List[Dict[str, Any]]:
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")
        s = Search(using=self.client, index=self.weather_actual_index)
        s = s.filter('range', datetime={'gte': s_date + 'T00:00:00+09:00', 'lte': e_date + 'T23:59:59+09:00'})
        if area_name:
            s = s.filter('term', area=area_name)
        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('datetime')
        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_weather_actual_daily(self, start_date: str, end_date: str, area_name: Optional[str] = None) -> List[Dict[str, Any]]:
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")
        s = Search(using=self.client, index=self.weather_actual_daily_index)
        s = s.filter('range', datetime={'gte': s_date + 'T00:00:00+09:00', 'lte': e_date + 'T23:59:59+09:00'})
        if area_name:
            s = s.filter('term', area=area_name)
        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('datetime')
        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_weather_forecast(self, start_date: str, end_date: str, area_name: Optional[str] = None) -> List[Dict[str, Any]]:
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")
        s = Search(using=self.client, index=self.weather_forecast_index)
        # Try new field name first; fall back to old field name if index hasn't been migrated
        s = s.filter('range', datetime={'gte': s_date + 'T00:00:00+09:00', 'lte': e_date + 'T23:59:59+09:00'})
        if area_name:
            s = s.filter('term', area=area_name)
        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('datetime')
        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_weather_forecast_daily(self, start_date: str, end_date: str, area_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return daily weather forecast data."""
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")
        s = Search(using=self.client, index=self.weather_forecast_daily_index)
        s = s.filter('range', datetime={'gte': s_date + 'T00:00:00+09:00', 'lte': e_date + 'T23:59:59+09:00'})
        if area_name:
            s = s.filter('term', area=area_name)
        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('datetime')
        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_weather_models(self, area_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return distinct weather model names from the weather_actual index."""
        s = Search(using=self.client, index=self.weather_actual_index)
        if area_name:
            s = s.query(Q('match', area=area_name))
        s = s.extra(size=0)
        s.aggs.bucket('models', 'terms', field='model', size=100)
        response = s.execute()
        buckets = response.aggregations.models.buckets
        return [{'model': b.key, 'doc_count': b.doc_count} for b in buckets]

    def get_weather_models_daily(self, area_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return distinct weather model names from the weather_actual_daily index."""
        s = Search(using=self.client, index=self.weather_actual_daily_index)
        if area_name:
            s = s.query(Q('match', area=area_name))
        s = s.extra(size=0)
        s.aggs.bucket('models', 'terms', field='model', size=100)
        response = s.execute()
        buckets = response.aggregations.models.buckets
        return [{'model': b.key, 'doc_count': b.doc_count} for b in buckets]

    def get_weather_models_forecast(self, area_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return distinct weather model names from the weather_forecast (hourly) index."""
        s = Search(using=self.client, index=self.weather_forecast_index)
        if area_name:
            s = s.query(Q('match', area=area_name))
        s = s.extra(size=0)
        s.aggs.bucket('models', 'terms', field='model', size=100)
        try:
            response = s.execute()
        except Exception:
            s = Search(using=self.client, index=self.weather_forecast_index)
            if area_name:
                s = s.query(Q('match', area=area_name))
            s = s.extra(size=0)
            s.aggs.bucket('models', 'terms', field='model.keyword', size=100)
            response = s.execute()
        buckets = response.aggregations.models.buckets
        return [{'model': b.key, 'doc_count': b.doc_count} for b in buckets]

    def get_weather_models_forecast_daily(self, area_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return distinct weather model names from the weather_forecast_daily index."""
        s = Search(using=self.client, index=self.weather_forecast_daily_index)
        if area_name:
            s = s.query(Q('match', area=area_name))
        s = s.extra(size=0)
        s.aggs.bucket('models', 'terms', field='model', size=100)
        try:
            response = s.execute()
        except Exception:
            s = Search(using=self.client, index=self.weather_forecast_daily_index)
            if area_name:
                s = s.query(Q('match', area=area_name))
            s = s.extra(size=0)
            s.aggs.bucket('models', 'terms', field='model.keyword', size=100)
            response = s.execute()
        buckets = response.aggregations.models.buckets
        return [{'model': b.key, 'doc_count': b.doc_count} for b in buckets]

    def get_bid_plans(self, start_date: str, end_date: str, site_id: Optional[str] = None, commodity_category: Optional[str] = None) -> List[Dict[str, Any]]:
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")
        s = Search(using=self.client, index=self.bid_plans_index)
        s = s.filter('range', **{'event_time': {'gte': s_date + 'T00:00:00', 'lte': e_date + 'T23:59:59'}})
        if site_id:
            s = s.filter('term', site_id=site_id)
        if commodity_category:
             s = s.filter('term', commodity_category=commodity_category)
        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('event_time')
        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_available_calculating_dates(self, start_date: str, end_date: str, area_name: str, model_name: str) -> List[Dict[str, str]]:
        s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")

        s = Search(using=self.client, index=self.prediction_index)
        s = s.filter('range', datetime={'gte': s_date + 'T00:00:00', 'lte': e_date + 'T23:59:59'})

        if area_name:
            s = s.filter('term', area=area_name)

        if model_name:
            s = s.query(Q('match', source=model_name))

        s.aggs.bucket('dates', 'terms', field='calculate_time.keyword', size=1000, order={'_key': 'desc'})
        s = s.extra(size=0)

        response = s.execute()

        return [{"calculating_date": bucket.key} for bucket in response.aggregations.dates.buckets]

    def get_available_models(self) -> List[Dict[str, Any]]:
        s = Search(using=self.client, index=self.prediction_index)
        s.aggs.bucket('sources', 'terms', field='source', size=100)
        s = s.extra(size=0)

        try:
            response = s.execute()
        except Exception:
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

    def _coverage_source_configs(self) -> List[tuple]:
        """
        Shared source configuration for data-coverage queries.
        Each tuple: (key, label, category, index, date_field, area_field_or_None, fmt,
                     filter_field, filter_value, interval, validation_type, expected_per_day)
        area_field: ES field for terms agg — text fields need '.keyword' sub-field;
                    weather 'area' is already keyword type so no sub-field needed.
        fmt: 'space' = 'YYYY-MM-DD HH:MM:SS', 'iso' = 'YYYY-MM-DDTHH:MM:SS', 'jst' = ISO+09:00
        filter_field/filter_value: optional extra must-term filter (e.g. source.keyword=mersol)
        interval: 'hour' (24 slots/day), '30m' (48 slots/day, one コマ per slot), or 'day' (1 doc/day)
        validation_type: 'fixed' (explicit expected count), 'variable' (use median), 'event' (binary present/absent)
        expected_per_day: expected doc count per day for 'fixed' sources; None for 'variable'/'event'
        """
        p = self.prediction_index
        t = self.tdgc_index
        return [
            # (key, label, category, index, date_field, area_field, fmt, filter_field, filter_value, interval, validation_type, expected_per_day)
            ('spot_price',      '現貨價格',   '現貨市場',   self.jepx_index,             'event_time', 'area.keyword', 'space', None, None, 'hour', 'fixed',    24),
            ('jepx_system',     '系統現貨',   '現貨市場',   self.jepx_system_index,      'event_time', None,           'space', None, None, 'hour', 'fixed',    24),
            ('intraday',        '日內交易',   '日內市場',   self.intraday_index,         'datetime',   None,           'space', None, None, 'hour', 'variable', None),
            ('imbalance',       '不平衡費率', '不平衡市場', self.imbalance_index,        'datetime',   'area.keyword', 'space', None, None, 'hour', 'fixed',    24),
            ('occto_area',      'OCCTO供需',  '電力供需',   self.occto_area_index,       'datetime',   'area.keyword', 'space', None, None, 'hour', 'fixed',    24),
            ('occto_inter',     'OCCTO連絡線','電力供需',   self.occto_inter_index,      'datetime',   None,           'space', None, None, 'hour', 'fixed',    24),
            ('occto_event',     'OCCTO事件',  '電力供需',   self.occto_event_index,      'datetime',   'area.keyword', 'space', None, None, 'hour', 'event',    None),
            # weather area field is ES keyword type — use 'area' directly (no .keyword needed)
            # hourly (24/day) and daily (1/day) are separate indices
            ('weather_actual',          '氣象實績(時別)', '氣象', self.weather_actual_index,         'datetime', 'area', 'jst', None, None, 'hour', 'variable', None),
            ('weather_actual_daily',    '氣象實績(日別)', '氣象', self.weather_actual_daily_index,   'datetime', 'area', 'jst', None, None, 'day',  'fixed',    1),
            ('weather_forecast',        '氣象預測(時別)', '氣象', self.weather_forecast_index,       'datetime', 'area', 'jst', None, None, 'hour', 'variable', None),
            ('weather_forecast_daily',  '氣象預測(日別)', '氣象', self.weather_forecast_daily_index, 'datetime', 'area', 'jst', None, None, 'day',  'fixed',    1),
            # TDGC — split by commodity_category; 1 doc per 30-min コマ → 48 slots/day
            ('tdgc_1000', '一次調整力',  '調整市場', t, 'datetime', 'area.keyword', 'space', 'commodity_category.keyword', '1000', '30m', 'fixed', 48),
            ('tdgc_1100', '二次調整力①', '調整市場', t, 'datetime', 'area.keyword', 'space', 'commodity_category.keyword', '1100', '30m', 'fixed', 48),
            ('tdgc_2100', '二次調整力②', '調整市場', t, 'datetime', 'area.keyword', 'space', 'commodity_category.keyword', '2100', '30m', 'fixed', 48),
            ('tdgc_2200', '三次調整力①', '調整市場', t, 'datetime', 'area.keyword', 'space', 'commodity_category.keyword', '2200', '30m', 'fixed', 48),
            ('tdgc_3100', '三次調整力②', '調整市場', t, 'datetime', 'area.keyword', 'space', 'commodity_category.keyword', '3100', '30m', 'fixed', 48),
            ('tdgc_3200', '需給調整②',   '調整市場', t, 'datetime', 'area.keyword', 'space', 'commodity_category.keyword', '3200', '30m', 'fixed', 48),
            ('tdgc_4000', '先渡し',       '調整市場', t, 'datetime', 'area.keyword', 'space', 'commodity_category.keyword', '4000', '30m', 'fixed', 48),
            # Prediction — split by source/model; 1 doc per 30-min コマ → 48 slots/day; ISO-T format
            ('prediction_quick',     'Quick',     '價格預測', p, 'datetime', 'area.keyword', 'iso', 'source.keyword', 'quick',     '30m', 'fixed', 48),
            ('prediction_volue',     'Volue',     '價格預測', p, 'datetime', 'area.keyword', 'iso', 'source.keyword', 'volue',     '30m', 'fixed', 48),
            ('prediction_d-price',   'D-Price',   '價格預測', p, 'datetime', 'area.keyword', 'iso', 'source.keyword', 'd-price',   '30m', 'fixed', 48),
            ('prediction_mersol',    'Mersol',    '價格預測', p, 'datetime', 'area.keyword', 'iso', 'source.keyword', 'mersol',    '30m', 'fixed', 48),
            ('prediction_matsumoto', 'Matsumoto', '價格預測', p, 'datetime', 'area.keyword', 'iso', 'source.keyword', 'matsumoto', '30m', 'fixed', 48),
            ('prediction_hdre_mod',  'HDRE Mod',  '價格預測', p, 'datetime', 'area.keyword', 'iso', 'source.keyword', 'hdre_mod',  '30m', 'fixed', 48),
            ('prediction_hdre_new',  'HDRE New',  '價格預測', p, 'datetime', 'area.keyword', 'iso', 'source.keyword', 'hdre_new',  '30m', 'fixed', 48),
            ('prediction_hdre_old',  'HDRE Old',  '價格預測', p, 'datetime', 'area.keyword', 'iso', 'source.keyword', 'hdre_old',  '30m', 'fixed', 48),
        ]

    @staticmethod
    def _coverage_bounds(date_str: str, fmt: str, end_of_day: bool = False) -> str:
        """Produce the datetime bound string for a given date and format."""
        d = datetime.strptime(date_str, "%Y%m%d")
        time_part = '23:59:59' if end_of_day else '00:00:00'
        if fmt == 'jst':
            return d.strftime(f'%Y-%m-%dT{time_part}+09:00')
        elif fmt == 'iso':
            return d.strftime(f'%Y-%m-%dT{time_part}')
        else:
            return d.strftime(f'%Y-%m-%d {time_part}')

    def get_data_coverage(self, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        """
        For each data source, query Elasticsearch for per-day document counts
        over the given date range, broken down by area where applicable.

        start_date / end_date: YYYYMMDD format strings.
        Returns a flat list of {source_key, source_label, category, area, date, doc_count}.
        """
        results: List[Dict[str, Any]] = []

        for (key, label, category, index, date_field, area_field, fmt, filter_field, filter_value, _interval, _vtype, _epd) in self._coverage_source_configs():
            s_bound = self._coverage_bounds(start_date, fmt, end_of_day=False)
            e_bound = self._coverage_bounds(end_date,   fmt, end_of_day=True)

            hist_params: Dict[str, Any] = {
                "field": date_field,
                "calendar_interval": "day",
                "min_doc_count": 0,
                "extended_bounds": {"min": s_bound, "max": e_bound},
            }
            if fmt == 'jst':
                hist_params["time_zone"] = "+09:00"

            # Build base query (range + optional extra filter term)
            base_must: List[Dict[str, Any]] = [{"range": {date_field: {"gte": s_bound, "lte": e_bound}}}]
            if filter_field:
                base_must.append({"term": {filter_field: filter_value}})
            base_query: Dict[str, Any] = {"bool": {"filter": base_must}} if len(base_must) > 1 else base_must[0]

            try:
                if area_field:
                    body = {
                        "size": 0,
                        "query": base_query,
                        "aggs": {
                            "by_area": {
                                "terms": {"field": area_field, "size": 20},
                                "aggs": {"by_day": {"date_histogram": hist_params}},
                            }
                        },
                    }
                    resp = self.client.search(index=index, body=body)
                    for area_bucket in resp['aggregations']['by_area']['buckets']:
                        area = area_bucket['key']
                        for day_bucket in area_bucket['by_day']['buckets']:
                            results.append({
                                'source_key': key,
                                'source_label': label,
                                'category': category,
                                'area': area,
                                'date': day_bucket['key_as_string'][:10],
                                'doc_count': day_bucket['doc_count'],
                            })
                else:
                    body = {
                        "size": 0,
                        "query": base_query,
                        "aggs": {"by_day": {"date_histogram": hist_params}},
                    }
                    resp = self.client.search(index=index, body=body)
                    for day_bucket in resp['aggregations']['by_day']['buckets']:
                        results.append({
                            'source_key': key,
                            'source_label': label,
                            'category': category,
                            'area': 'system',
                            'date': day_bucket['key_as_string'][:10],
                            'doc_count': day_bucket['doc_count'],
                        })
            except Exception as e:
                logger.warning(f"get_data_coverage: skipping source '{key}': {e}")

        return results

    # Label mappings for dynamic sources — add new entries here when new models/categories appear
    _PREDICTION_SOURCE_LABELS: Dict[str, str] = {
        'quick': 'Quick', 'volue': 'Volue', 'd-price': 'D-Price',
        'mersol': 'Mersol', 'matsumoto': 'Matsumoto',
        'hdre_mod': 'HDRE Mod', 'hdre_new': 'HDRE New', 'hdre_old': 'HDRE Old',
    }
    _TDGC_CATEGORY_LABELS: Dict[str, str] = {
        '1000': '一次調整力', '1100': '二次調整力①', '2100': '二次調整力②',
        '2200': '三次調整力①', '3100': '三次調整力②', '3200': '需給調整②', '4000': '先渡し',
    }

    def get_coverage_sources(self) -> Dict[str, Any]:
        """
        Dynamically fetch the currently available prediction model names and TDGC commodity
        categories from Elasticsearch, and return them as full SourceConfig objects so the
        frontend can render source chips without hardcoding these lists.

        Returns:
            {
                "prediction_sources": [{"key": "prediction_mersol", "label": "Mersol", "category": "價格預測", "interval": "30m"}, ...],
                "tdgc_categories":    [{"key": "tdgc_1000", "label": "一次調整力", "category": "調整市場",   "interval": "30m"}, ...],
            }
        """
        result: Dict[str, Any] = {"prediction_sources": [], "tdgc_categories": []}
        try:
            resp = self.client.search(
                index=self.prediction_index,
                body={"size": 0, "aggs": {"sources": {"terms": {"field": "source.keyword", "size": 50}}}},
            )
            result["prediction_sources"] = [
                {
                    "key": f"prediction_{b['key']}",
                    "label": self._PREDICTION_SOURCE_LABELS.get(b['key'], b['key'].replace('_', ' ').title()),
                    "category": "價格預測",
                    "interval": "30m",
                    "validation_type": "fixed",
                    "expected_per_day": 48,
                }
                for b in resp['aggregations']['sources']['buckets']
            ]
        except Exception as e:
            logger.warning(f"get_coverage_sources: prediction sources query failed: {e}")

        try:
            resp = self.client.search(
                index=self.tdgc_index,
                body={"size": 0, "aggs": {"cats": {"terms": {"field": "commodity_category.keyword", "size": 50}}}},
            )
            result["tdgc_categories"] = [
                {
                    "key": f"tdgc_{b['key']}",
                    "label": self._TDGC_CATEGORY_LABELS.get(b['key'], b['key']),
                    "category": "調整市場",
                    "interval": "30m",
                    "validation_type": "fixed",
                    "expected_per_day": 48,
                }
                for b in sorted(resp['aggregations']['cats']['buckets'], key=lambda x: x['key'])
            ]
        except Exception as e:
            logger.warning(f"get_coverage_sources: tdgc categories query failed: {e}")

        return result

    def get_coverage_detail(self, source_key: str, area: str, date: str):
        """
        For a single source × area × date, return per-slot document counts.

        source_key: one of the source keys defined in _coverage_source_configs.
        area: lowercase area name (e.g. 'tokyo') or 'system' for system-wide sources.
        date: YYYYMMDD string.
        Returns (rows, interval) where rows is a list of {slot, label, doc_count},
        always 24 entries for 'hour', 48 entries for '30m', or 1 entry for 'day'.
        """
        cfg = next(
            (c for c in self._coverage_source_configs() if c[0] == source_key),
            None,
        )
        if cfg is None:
            logger.warning(f"get_coverage_detail: unknown source_key '{source_key}'")
            return [{'slot': h, 'label': f"{h:02d}:00", 'doc_count': 0} for h in range(24)], 'hour'

        _, _label, _category, index, date_field, area_field, fmt, filter_field, filter_value, interval, _vtype, _epd = cfg

        s_bound = self._coverage_bounds(date, fmt, end_of_day=False)
        e_bound = self._coverage_bounds(date, fmt, end_of_day=True)

        # Build query — filter by area, plus optional sub-source filter (must be before interval branch)
        must_clauses: List[Dict[str, Any]] = [{"range": {date_field: {"gte": s_bound, "lte": e_bound}}}]
        if area_field and area != 'system':
            must_clauses.append({"term": {area_field: area}})
        if filter_field:
            must_clauses.append({"term": {filter_field: filter_value}})
        query: Dict[str, Any] = {"bool": {"filter": must_clauses}} if len(must_clauses) > 1 else must_clauses[0]

        # Daily sources: single count query — no time histogram needed
        if interval == 'day':
            try:
                count_resp = self.client.count(index=index, body={"query": query})
                count = count_resp['count']
                return [{'slot': 0, 'label': '全日', 'doc_count': count}], 'day'
            except Exception as e:
                logger.warning(f"get_coverage_detail: error for '{source_key}/{area}/{date}': {e}")
                return [{'slot': 0, 'label': '全日', 'doc_count': 0}], 'day'

        # 30m sources use fixed_interval; hourly sources use calendar_interval
        if interval == '30m':
            hist_params: Dict[str, Any] = {
                "field": date_field,
                "fixed_interval": "30m",
                "min_doc_count": 0,
                "extended_bounds": {"min": s_bound, "max": e_bound},
            }
        else:
            hist_params = {
                "field": date_field,
                "calendar_interval": "hour",
                "min_doc_count": 0,
                "extended_bounds": {"min": s_bound, "max": e_bound},
            }
        if fmt == 'jst':
            hist_params["time_zone"] = "+09:00"

        body = {
            "size": 0,
            "query": query,
            "aggs": {"by_slot": {"date_histogram": hist_params}},
        }

        total_slots = 48 if interval == '30m' else 24

        try:
            resp = self.client.search(index=index, body=body)
            buckets = resp['aggregations']['by_slot']['buckets']
            # key_as_string: "2026-03-27 05:30:00" or "2026-03-27T05:30:00" or "...+09:00"
            results = []
            for bucket in buckets:
                ks = bucket['key_as_string']
                hour = int(ks[11:13])
                minute = int(ks[14:16])
                slot = hour * 2 + minute // 30 if interval == '30m' else hour
                label = f"{ks[11:13]}:{ks[14:16]}" if interval == '30m' else f"{ks[11:13]}:00"
                results.append({'slot': slot, 'label': label, 'doc_count': bucket['doc_count']})
            # Fill any missing slots with 0
            present = {r['slot'] for r in results}
            for s in range(total_slots):
                if s not in present:
                    if interval == '30m':
                        h, m = divmod(s, 2)
                        lbl = f"{h:02d}:{'30' if m else '00'}"
                    else:
                        lbl = f"{s:02d}:00"
                    results.append({'slot': s, 'label': lbl, 'doc_count': 0})
            results.sort(key=lambda x: x['slot'])
            return results, interval
        except Exception as e:
            logger.warning(f"get_coverage_detail: error for '{source_key}/{area}/{date}': {e}")
            if interval == '30m':
                return [{'slot': s, 'label': f"{s//2:02d}:{'30' if s%2 else '00'}", 'doc_count': 0} for s in range(48)], '30m'
            return [{'slot': h, 'label': f"{h:02d}:00", 'doc_count': 0} for h in range(24)], 'hour'


    # ── Coverage preview (actual values for charting) ─────────────────────────────

    @staticmethod
    def _to_unix_ms(dt_str: str) -> Optional[int]:
        """Convert any ES datetime string to Unix milliseconds (JST assumed when no offset)."""
        from datetime import timezone, timedelta
        JST = timezone(timedelta(hours=9))
        try:
            s = str(dt_str).replace('+09:00', '').replace('Z', '').replace('T', ' ')[:19]
            dt = datetime.strptime(s, '%Y-%m-%d %H:%M:%S').replace(tzinfo=JST)
            return int(dt.timestamp() * 1000)
        except Exception:
            return None

    def _preview_config(self, source_key: str) -> Optional[Dict[str, Any]]:
        """
        Map a source_key to an ES query config and chart group definitions used by
        get_coverage_preview(). Returns None for unsupported / system-only sources.
        """
        # ── TDGC (dynamic: tdgc_1000, tdgc_1100, …) ─────────────────────────────
        if source_key.startswith('tdgc_'):
            category = source_key[5:]
            label_map = self._TDGC_CATEGORY_LABELS
            cat_label = label_map.get(category, category)
            return {
                'index': self.tdgc_index,
                'date_field': 'datetime',
                'fmt': 'space',
                'area_field': 'area.keyword',
                'filter_field': 'commodity_category.keyword',
                'filter_value': category,
                'groups': [
                    {
                        'id': 'prices', 'label': f'{cat_label} — 成交價格',
                        'fields': [
                            {'field': 'CorrectedUnitPriceAve', 'name': '補正後單價 (Ave)', 'unit': '¥/kWh', 'type': 'line', 'color': '#ff7043'},
                            {'field': 'TsoPriceAve',           'name': 'TSO 價格 (Ave)',   'unit': '¥/kWh', 'type': 'line', 'color': '#ffa000'},
                        ],
                    },
                    {
                        'id': 'quantities', 'label': f'{cat_label} — 數量',
                        'fields': [
                            {'field': 'InAreaQuantity',       'name': '地區需求量',   'unit': 'kWh', 'type': 'bar', 'color': '#42a5f5'},
                            {'field': 'TotalContractQuantity', 'name': '總成交量',    'unit': 'kWh', 'type': 'bar', 'color': '#66bb6a'},
                        ],
                    },
                ],
            }

        # ── Prediction (dynamic: prediction_mersol, prediction_volue, …) ─────────
        if source_key.startswith('prediction_'):
            model = source_key[11:]
            model_label = self._PREDICTION_SOURCE_LABELS.get(model, model.replace('_', ' ').title())
            return {
                'index': self.prediction_index,
                'date_field': 'datetime',
                'fmt': 'iso',
                'area_field': 'area.keyword',
                'filter_field': 'source.keyword',
                'filter_value': model,
                'expand_additional_data': True,   # price_5/price_95 are nested in additional_data
                'groups': [
                    {
                        'id': 'prediction', 'label': f'{model_label} — 預測價格',
                        'fields': [
                            {'field': 'forecast_price', 'name': 'P50 (中位數)', 'unit': '¥/kWh', 'type': 'line', 'color': '#ff7043'},
                            {'field': 'price_5',        'name': 'P5  (低估)',   'unit': '¥/kWh', 'type': 'line', 'color': '#42a5f5'},
                            {'field': 'price_95',       'name': 'P95 (高估)',   'unit': '¥/kWh', 'type': 'line', 'color': '#ef5350'},
                        ],
                    },
                ],
            }

        # ── Static sources ────────────────────────────────────────────────────────
        static: Dict[str, Dict[str, Any]] = {
            'spot_price': {
                'index': self.jepx_index,
                'date_field': 'event_time', 'fmt': 'space', 'area_field': 'area.keyword',
                'groups': [
                    {
                        'id': 'prices', 'label': '現貨價格',
                        'fields': [
                            {'field': 'price',          'name': '地區現貨價',   'unit': '¥/kWh', 'type': 'line', 'color': '#ff7043'},
                            {'field': 'system_price',   'name': '系統現貨價',   'unit': '¥/kWh', 'type': 'line', 'color': '#ffa000'},
                            {'field': 'avoidable_cost', 'name': '迴避可能費用', 'unit': '¥/kWh', 'type': 'line', 'color': '#ffcc80'},
                        ],
                    },
                    {
                        'id': 'quantities', 'label': '交易量',
                        'fields': [
                            {'field': 'sell_quantity',     'name': '賣出量', 'unit': 'kWh', 'type': 'bar', 'color': '#ef5350'},
                            {'field': 'buy_quantity',      'name': '買入量', 'unit': 'kWh', 'type': 'bar', 'color': '#42a5f5'},
                            {'field': 'contract_quantity', 'name': '成交量', 'unit': 'kWh', 'type': 'bar', 'color': '#66bb6a'},
                        ],
                    },
                ],
            },
            'jepx_system': {
                'index': self.jepx_system_index,
                'date_field': 'event_time', 'fmt': 'space', 'area_field': None,
                'groups': [
                    {
                        'id': 'prices', 'label': '系統現貨價格',
                        'fields': [
                            {'field': 'system_price',   'name': '系統現貨價',   'unit': '¥/kWh', 'type': 'line', 'color': '#ff7043'},
                            {'field': 'avoidable_cost', 'name': '迴避可能費用', 'unit': '¥/kWh', 'type': 'line', 'color': '#ffa000'},
                        ],
                    },
                    {
                        'id': 'quantities', 'label': '交易量',
                        'fields': [
                            {'field': 'sell_quantity',     'name': '賣出量', 'unit': 'kWh', 'type': 'bar', 'color': '#ef5350'},
                            {'field': 'buy_quantity',      'name': '買入量', 'unit': 'kWh', 'type': 'bar', 'color': '#42a5f5'},
                            {'field': 'contract_quantity', 'name': '成交量', 'unit': 'kWh', 'type': 'bar', 'color': '#66bb6a'},
                        ],
                    },
                ],
            },
            'intraday': {
                'index': self.intraday_index,
                'date_field': 'datetime', 'fmt': 'space', 'area_field': None,
                'groups': [
                    {
                        'id': 'ohlc', 'label': 'OHLC 價格',
                        'fields': [
                            {'field': 'high_price',    'name': '最高',     'unit': '¥/kWh', 'type': 'line', 'color': '#ef5350'},
                            {'field': 'low_price',     'name': '最低',     'unit': '¥/kWh', 'type': 'line', 'color': '#42a5f5'},
                            {'field': 'average_price', 'name': '平均',     'unit': '¥/kWh', 'type': 'line', 'color': '#66bb6a'},
                            {'field': 'opening_price', 'name': '開盤',     'unit': '¥/kWh', 'type': 'line', 'color': '#ab47bc'},
                            {'field': 'closing_price', 'name': '收盤',     'unit': '¥/kWh', 'type': 'line', 'color': '#ff7043'},
                        ],
                    },
                    {
                        'id': 'volume', 'label': '成交量',
                        'fields': [
                            {'field': 'total_contracted_volume', 'name': '成交量', 'unit': 'kWh', 'type': 'bar', 'color': '#26a69a'},
                        ],
                    },
                ],
            },
            'imbalance': {
                'index': self.imbalance_index,
                'date_field': 'datetime', 'fmt': 'space', 'area_field': 'area.keyword',
                'groups': [
                    {
                        'id': 'rates', 'label': '不平衡費率',
                        'fields': [
                            {'field': 'imbalance_surplus_rate', 'name': '正不平衡費率', 'unit': '¥/kWh', 'type': 'line', 'color': '#66bb6a'},
                            {'field': 'imbalance_deficit_rate', 'name': '負不平衡費率', 'unit': '¥/kWh', 'type': 'line', 'color': '#ef5350'},
                        ],
                    },
                    {
                        'id': 'quantity', 'label': '不平衡量',
                        'fields': [
                            {'field': 'imbalance_quantity', 'name': '不平衡量', 'unit': 'kWh', 'type': 'bar', 'color': '#42a5f5'},
                        ],
                    },
                ],
            },
            'occto_area': {
                'index': self.occto_area_index,
                'date_field': 'datetime', 'fmt': 'space', 'area_field': 'area.keyword',
                'groups': [
                    {
                        'id': 'supply_demand', 'label': '供需概覽',
                        'fields': [
                            {'field': 'area_demand', 'name': '需求',   'unit': 'MW', 'type': 'line', 'color': '#ffa000'},
                            {'field': 'total',       'name': '總供電', 'unit': 'MW', 'type': 'line', 'color': '#ff7043'},
                        ],
                    },
                    {
                        # Stacked bar chart — all energy sources in one chart (matches generation mix page)
                        'id': 'generation_mix', 'label': '發電組合', 'stacked': True,
                        'fields': [
                            {'field': 'nuclear_power',                 'name': '核能',   'unit': 'MW', 'type': 'bar',  'color': '#7b61ff'},
                            {'field': 'thermal',                       'name': '火力',   'unit': 'MW', 'type': 'bar',  'color': '#ff7043'},
                            {'field': 'hydropower',                    'name': '水力',   'unit': 'MW', 'type': 'bar',  'color': '#29b6f6'},
                            {'field': 'geothermal_power',              'name': '地熱',   'unit': 'MW', 'type': 'bar',  'color': '#a1887f'},
                            {'field': 'biomass',                       'name': '生質能', 'unit': 'MW', 'type': 'bar',  'color': '#8bc34a'},
                            {'field': 'solar_power_generation_actual', 'name': '太陽能', 'unit': 'MW', 'type': 'bar',  'color': '#ffca28'},
                            {'field': 'wind_power_generation_actual',  'name': '風力',   'unit': 'MW', 'type': 'bar',  'color': '#26c6da'},
                            {'field': 'pumped_storage',                'name': '抽蓄',   'unit': 'MW', 'type': 'bar',  'color': '#78909c'},
                            {'field': 'battery_storage',               'name': '電池',   'unit': 'MW', 'type': 'bar',  'color': '#00cc7a'},
                            {'field': 'interconnection_line',          'name': '連絡線', 'unit': 'MW', 'type': 'line', 'color': '#90a4ae'},
                            {'field': 'others',                        'name': '其他',   'unit': 'MW', 'type': 'bar',  'color': '#bdbdbd'},
                        ],
                    },
                ],
            },
            'occto_inter': {
                'index': self.occto_inter_index,
                'date_field': 'datetime', 'fmt': 'space', 'area_field': None,
                # group_by_field: pivot each metric into one series per distinct interconnection line
                'group_by_field': 'interconnection_name',
                'groups': [
                    {'id': 'forward_planned_flow',      'label': '正向計劃潮流', 'field': 'forward_planned_flow',      'unit': 'MW'},
                    {'id': 'reverse_planned_flow',      'label': '逆向計劃潮流', 'field': 'reverse_planned_flow',      'unit': 'MW'},
                    {'id': 'forward_available_capacity','label': '正向可用容量', 'field': 'forward_available_capacity', 'unit': 'MW'},
                    {'id': 'reverse_available_capacity','label': '逆向可用容量', 'field': 'reverse_available_capacity', 'unit': 'MW'},
                ],
            },
            'occto_event': {
                'index': self.occto_event_index,
                'date_field': 'datetime', 'fmt': 'space', 'area_field': 'area.keyword',
                'is_event': True,
            },
        }
        return static.get(source_key)

    def get_coverage_preview(self, source_key: str, area: str, date: str) -> Dict[str, Any]:
        """
        Return actual data values for source × area × date for charting in the
        data status detail drawer. Each group contains one or more time series.

        source_key: source key from _coverage_source_configs (e.g. 'spot_price', 'tdgc_1000')
        area: lowercase area name or 'system'
        date: YYYYMMDD string
        """
        base = {'source_key': source_key, 'area': area, 'date': date}
        cfg = self._preview_config(source_key)
        if cfg is None:
            return {**base, 'groups': []}

        index       = cfg['index']
        date_field  = cfg['date_field']
        fmt         = cfg['fmt']
        area_field   = cfg.get('area_field')
        filter_field  = cfg.get('filter_field')
        filter_value  = cfg.get('filter_value')
        is_event      = cfg.get('is_event', False)
        groups_cfg    = cfg.get('groups', [])
        group_by_field = cfg.get('group_by_field')  # for occto_inter: 'interconnection_name'

        # Build range bounds
        s_bound = self._coverage_bounds(date, fmt, end_of_day=False)
        e_bound = self._coverage_bounds(date, fmt, end_of_day=True)

        must: List[Dict[str, Any]] = [{"range": {date_field: {"gte": s_bound, "lte": e_bound}}}]
        if area_field and area != 'system':
            must.append({"term": {area_field: area}})
        if filter_field:
            must.append({"term": {filter_field: filter_value}})

        # Fix A: For prediction sources, auto-filter to the latest calculate_time so
        # multiple forecasting runs for the same target date don't overlap on the chart.
        latest_calc_time: Optional[str] = None
        if source_key.startswith('prediction_'):
            times = self.get_prediction_calculate_times(source_key, area, date)
            if times:
                latest_calc_time = times[0]   # sorted descending → times[0] is most recent
                must.append({"term": {"calculate_time.keyword": latest_calc_time}})

        query: Dict[str, Any] = {"bool": {"filter": must}} if len(must) > 1 else must[0]

        try:
            resp = self.client.search(
                index=index,
                body={"size": 2000, "query": query, "sort": [{date_field: "asc"}]},
            )
            hits = [h['_source'] for h in resp['hits']['hits']]
        except Exception as e:
            logger.warning(f"get_coverage_preview: error for '{source_key}/{area}/{date}': {e}")
            return {**base, 'groups': []}

        # For prediction sources, price_5/price_95 are nested inside additional_data JSON
        if cfg.get('expand_additional_data'):
            expanded = []
            for h in hits:
                extra = h.get('additional_data') or {}
                if isinstance(extra, str):
                    try:
                        extra = json.loads(extra)
                    except Exception:
                        extra = {}
                expanded.append({**h, **extra})
            hits = expanded

        # ── Event-based sources ───────────────────────────────────────────────────
        if is_event:
            events = []
            for h in hits:
                dt_str = str(h.get(date_field, ''))
                val = h.get('value')
                events.append({
                    'datetime': dt_str,
                    'area': str(h.get('area', area)),
                    'description': str(h.get('description', '')),
                    'value': float(val) if isinstance(val, (int, float)) else None,
                })
            return {**base, 'events': events}

        # ── Fix B: group_by_field pivot (e.g. occto_inter by interconnection_name) ──
        # One series per distinct value of group_by_field, one chart group per metric.
        groups: List[Dict[str, Any]] = []
        if group_by_field:
            LINE_COLORS = [
                '#42a5f5', '#ff7043', '#66bb6a', '#ffa000', '#ab47bc',
                '#26c6da', '#ef5350', '#8d6e63', '#7c4dff', '#90a4ae',
            ]
            # Preserve insertion order (= sorted by first appearance in time-sorted hits)
            line_names = list(dict.fromkeys(
                h.get(group_by_field) for h in hits if h.get(group_by_field)
            ))
            for grp in groups_cfg:
                field = grp['field']
                series_list = []
                for idx, line_name in enumerate(line_names):
                    line_hits = [h for h in hits if h.get(group_by_field) == line_name]
                    data_pts: List[List] = []
                    for h in line_hits:
                        v = h.get(field)
                        if v is None:
                            continue
                        ts_ms = self._to_unix_ms(str(h.get(date_field, '')))
                        if ts_ms is None:
                            continue
                        try:
                            data_pts.append([ts_ms, float(v)])
                        except (TypeError, ValueError):
                            continue
                    if data_pts:
                        series_list.append({
                            'name':  line_name,
                            'unit':  grp.get('unit', ''),
                            'type':  'line',
                            'color': LINE_COLORS[idx % len(LINE_COLORS)],
                            'data':  data_pts,
                        })
                if series_list:
                    groups.append({'id': grp['id'], 'label': grp['label'], 'series': series_list})
            return {**base, 'groups': groups}

        # ── Standard time-series sources: build groups from fields list ────────────
        for grp in groups_cfg:
            series_list = []
            for fcfg in grp['fields']:
                field = fcfg['field']
                data_pts = []
                for h in hits:
                    v = h.get(field)
                    if v is None:
                        continue
                    ts_ms = self._to_unix_ms(str(h.get(date_field, '')))
                    if ts_ms is None:
                        continue
                    try:
                        data_pts.append([ts_ms, float(v)])
                    except (TypeError, ValueError):
                        continue
                if data_pts:
                    series_list.append({
                        'name':  fcfg['name'],
                        'unit':  fcfg['unit'],
                        'type':  fcfg.get('type', 'line'),
                        'color': fcfg['color'],
                        'data':  data_pts,
                    })
            if series_list:
                grp_entry: Dict[str, Any] = {'id': grp['id'], 'label': grp['label'], 'series': series_list}
                if grp.get('stacked'):
                    grp_entry['stacked'] = True
                groups.append(grp_entry)

        # Always expose raw hit count so the frontend can distinguish "no documents
        # found" (hit_count=0) from "documents exist but fields are null" (hit_count>0,
        # groups=[]).  Also log the latter case to aid field-name diagnostics.
        hit_count = len(hits)
        if not groups and hits:
            logger.warning(
                f"get_coverage_preview: {hit_count} hit(s) for '{source_key}/{area}/{date}' "
                f"but all series are empty — check field names. "
                f"First hit keys: {list(hits[0].keys())[:25]}"
            )

        result = {**base, 'groups': groups, 'hit_count': hit_count}
        if latest_calc_time:
            result['calculate_time'] = latest_calc_time
        return result

    def get_prediction_calculate_times(self, source_key: str, area: str, date: str) -> List[str]:
        """
        Return distinct calculate_time values for a prediction source × area × date,
        sorted descending (most recent first).

        date: YYYYMMDD string
        Returns list of date strings like ["2026-03-28", "2026-03-27", ...]
        """
        if not source_key.startswith('prediction_'):
            return []
        model = source_key[11:]
        s_bound = self._coverage_bounds(date, 'iso', end_of_day=False)
        e_bound = self._coverage_bounds(date, 'iso', end_of_day=True)
        must: List[Dict[str, Any]] = [
            {"range": {"datetime": {"gte": s_bound, "lte": e_bound}}},
            {"term": {"source.keyword": model}},
        ]
        if area and area != 'system':
            must.append({"term": {"area.keyword": area}})
        try:
            resp = self.client.search(
                index=self.prediction_index,
                body={
                    "size": 0,
                    "query": {"bool": {"filter": must}},
                    "aggs": {
                        "calc_times": {
                            "terms": {"field": "calculate_time.keyword", "size": 100, "order": {"_key": "desc"}},
                        },
                    },
                },
            )
            return [b['key'] for b in resp['aggregations']['calc_times']['buckets']]
        except Exception as e:
            logger.warning(f"get_prediction_calculate_times: error for '{source_key}/{area}/{date}': {e}")
            return []

    def get_coverage_records(
        self,
        source_key: str,
        area: str,
        date: str,
        slot: Optional[int] = None,
        calculate_time: Optional[str] = None,
        page: int = 0,
        size: int = 20,
    ) -> Dict[str, Any]:
        """
        Return paginated individual ES documents for source × area × date.
        Optionally filtered to a single time slot and/or a specific calculate_time
        (for prediction sources that have multiple forecasting runs per day).

        source_key: source key from _coverage_source_configs
        area: lowercase area name or 'system'
        date: YYYYMMDD string
        slot: 0-based slot index (0–23 for hour, 0–47 for 30m); None = all slots
        calculate_time: YYYY-MM-DD date string; None = all calculation runs
        page: 0-based page number
        size: records per page (max 50)
        """
        base = {'source_key': source_key, 'area': area, 'date': date, 'slot': slot,
                'calculate_time': calculate_time, 'page': page, 'size': size}

        cfg = next(
            (c for c in self._coverage_source_configs() if c[0] == source_key),
            None,
        )
        if cfg is None:
            logger.warning(f"get_coverage_records: unknown source_key '{source_key}'")
            return {**base, 'total': 0, 'interval': 'hour', 'rows': []}

        _, _label, _category, index, date_field, area_field, fmt, filter_field, filter_value, interval, _vtype, _epd = cfg
        is_prediction = source_key.startswith('prediction_')

        # Build time bounds — narrow to a slot window if requested
        if slot is not None and interval != 'day':
            if interval == '30m':
                slot_hour, slot_half = divmod(slot, 2)
                slot_minute = slot_half * 30
                end_minute = slot_minute + 29
                end_hour = slot_hour if end_minute < 60 else slot_hour + 1
                end_minute = end_minute % 60
            else:  # 'hour'
                slot_hour = slot
                slot_minute = 0
                end_hour = slot_hour
                end_minute = 59

            d = datetime.strptime(date, '%Y%m%d')
            start_dt = d.replace(hour=slot_hour, minute=slot_minute, second=0)
            end_dt   = d.replace(hour=end_hour,   minute=end_minute,  second=59)

            if fmt == 'jst':
                s_bound = start_dt.strftime('%Y-%m-%dT%H:%M:%S+09:00')
                e_bound = end_dt.strftime('%Y-%m-%dT%H:%M:%S+09:00')
            elif fmt == 'iso':
                s_bound = start_dt.strftime('%Y-%m-%dT%H:%M:%S')
                e_bound = end_dt.strftime('%Y-%m-%dT%H:%M:%S')
            else:
                s_bound = start_dt.strftime('%Y-%m-%d %H:%M:%S')
                e_bound = end_dt.strftime('%Y-%m-%d %H:%M:%S')
        else:
            s_bound = self._coverage_bounds(date, fmt, end_of_day=False)
            e_bound = self._coverage_bounds(date, fmt, end_of_day=True)

        must: List[Dict[str, Any]] = [{"range": {date_field: {"gte": s_bound, "lte": e_bound}}}]
        if area_field and area != 'system':
            must.append({"term": {area_field: area}})
        if filter_field:
            must.append({"term": {filter_field: filter_value}})
        if calculate_time and is_prediction:
            must.append({"term": {"calculate_time.keyword": calculate_time}})
        query: Dict[str, Any] = {"bool": {"filter": must}} if len(must) > 1 else must[0]

        from_ = page * size
        try:
            resp = self.client.search(
                index=index,
                body={
                    "from": from_,
                    "size": size,
                    "query": query,
                    "sort": [{date_field: "asc"}],
                    "track_total_hits": True,
                },
            )
        except Exception as e:
            logger.warning(f"get_coverage_records: error for '{source_key}/{area}/{date}': {e}")
            return {**base, 'total': 0, 'interval': interval, 'rows': []}

        total = resp['hits']['total']['value']
        hits = [h['_source'] for h in resp['hits']['hits']]

        # Flatten additional_data for prediction sources
        if is_prediction:
            expanded = []
            for h in hits:
                extra = h.get('additional_data') or {}
                if isinstance(extra, str):
                    try:
                        extra = json.loads(extra)
                    except Exception:
                        extra = {}
                expanded.append({**h, **extra})
            hits = expanded

        rows = []
        for h in hits:
            dt_raw = str(h.get(date_field, ''))
            # Parse hour/minute from the datetime string (positions 11–15 work for both space and T formats)
            try:
                hour   = int(dt_raw[11:13])
                minute = int(dt_raw[14:16])
                if interval == '30m':
                    slot_idx = hour * 2 + minute // 30
                    slot_lbl = f"{hour:02d}:{'30' if minute >= 30 else '00'}"
                elif interval == 'day':
                    slot_idx = 0
                    slot_lbl = '全日'
                else:
                    slot_idx = hour
                    slot_lbl = f"{hour:02d}:{minute:02d}"
            except (ValueError, IndexError):
                slot_idx = 0
                slot_lbl = '──'

            # Remove internal / meta fields from the returned fields dict
            fields = {k: v for k, v in h.items()
                      if not k.startswith('@') and k not in ('additional_data',)}

            rows.append({
                'slot_index': slot_idx,
                'slot_label': slot_lbl,
                'timestamp':  dt_raw,
                'fields':     fields,
            })

        return {**base, 'total': total, 'interval': interval, 'rows': rows}


# Singleton instance to be shared across API endpoints
es_service = ESService()
