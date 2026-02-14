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
            verify_certs=True
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
        self.weather_forecast_index = indices['weather_forecast']
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
        s = s.filter('range', weather_datetime={'gte': s_date + 'T00:00:00', 'lte': e_date + 'T23:59:59'})
        if area_name:
            s = s.query(Q('match', region=area_name))
        s = s.extra(size=MAX_ES_RESULTS)
        s = s.sort('weather_datetime')
        response = s.execute()
        return [hit.to_dict() for hit in response]

    def get_weather_forecast(self, start_date: str, end_date: str, area_name: Optional[str] = None) -> List[Dict[str, Any]]:
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
