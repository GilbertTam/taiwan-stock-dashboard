import datetime
import pandas as pd
from tqdm import tqdm
import time

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings

from area.models import Area
from weather_data.models import WeatherForecast
from quick_api.quickapi import QuickAPI

class Command(BaseCommand):
    help = '下載天氣預測資料並儲存到資料庫'

    def add_arguments(self, parser):
        parser.add_argument('from_date', type=str, help='開始日期 (YYYYMMDD)')
        parser.add_argument('to_date', type=str, help='結束日期 (YYYYMMDD)')

        parser.add_argument(
            '--page-size',
            type=int,
            default=5000,
            help='每頁資料筆數',
        )

    def fetch_all_weather_forecasts(
        self,
        username: str, 
        password: str, 
        from_date: str,
        to_date: str,
        page_size: int = 5000
    ) -> pd.DataFrame:
        """取得天氣預測資料"""
        all_results = []
        
        start_datetime = datetime.datetime.strptime(from_date, "%Y%m%d")
        end_datetime = datetime.datetime.strptime(to_date, "%Y%m%d")
        date_list = [
            start_datetime + datetime.timedelta(days=x) 
            for x in range(0, (end_datetime-start_datetime).days+1)
        ]

        for area in Area.objects.all():

            # 取得區域名稱
            area_name_jp = area.name_jp

            # 下載天氣實際資料
            self.stdout.write(self.style.SUCCESS(f"下載 {area_name_jp} 的天氣實際資料..."))

            for date in tqdm(date_list, desc="下載天氣預測資料"):
                # 不需要調整時區，因為預測資料的時間戳記已經是正確的
                from_datetime = date.strftime("%Y%m%d%H0000")
                to_datetime = (date + datetime.timedelta(hours=23)).strftime("%Y%m%d%H0000")

                max_retries = 3
                retry_delay = 5
                retry_count = 0
                
                while retry_count < max_retries:
                    try:
                        with QuickAPI(username=username, password=password) as api:
                            result = api.weather.get_weather_forecast(
                                from_datetime=from_datetime,
                                to_datetime=to_datetime,
                                area=area_name_jp,
                                section=api.weather.section.ALL,
                                page=1,
                                page_size=page_size
                            )
                        all_results.extend(result['results'])
                        break
                    except Exception as e:
                        retry_count += 1
                        if retry_count < max_retries:
                            self.stdout.write(
                                self.style.WARNING(
                                    f"第 {retry_count} 次嘗試失敗: {str(e)}，{retry_delay} 秒後重試..."
                                )
                            )
                            time.sleep(retry_delay)
                        else:
                            self.stdout.write(
                                self.style.ERROR(
                                    f"已重試 {max_retries} 次仍然失敗: {str(e)}"
                                )
                            )

        df = pd.DataFrame(all_results)
        df['get_datetime'] = pd.to_datetime(df['get_datetime'])  # 預測時間
        df['weather_datetime'] = pd.to_datetime(df['weather_datetime'])     # 目標時間
        df = df.sort_values(['get_datetime', 'weather_datetime']).reset_index(drop=True)
        """
        # 保留最新的預測資料
        df = df.drop_duplicates(['weather_datetime', 'get_datetime'], keep='last').reset_index(drop=True)
        """
        return df

    def save_to_database(self, df: pd.DataFrame):
        """將資料儲存到資料庫"""
        self.stdout.write("開始寫入資料庫...")
        
        # 取得區域名稱對應的 Area 物件
        area_dicts = {area.name_jp:area for area in Area.objects.all()}

        # 取得現有的預測天氣資料
        existing_forecasts = {
            (
                timezone.localtime(weather_data.get_datetime),
                timezone.localtime(weather_data.weather_datetime),
                weather_data.area_id,
                weather_data.city
            ): weather_data
            for weather_data in WeatherForecast.objects.filter(
                weather_datetime__range=(
                    df['weather_datetime'].min(),
                    df['weather_datetime'].max()
                )
            )
        }

        # 準備批量創建的物件列表
        forecasts_to_create = []
        forecasts_to_update = []

        total_rows = len(df)
        
        for _, row in tqdm(df.iterrows(), total=total_rows, desc="處理資料"):
            area = area_dicts.get(row['area'])
            if area is None:
                self.stdout.write(self.style.WARNING(f"找不到區域: {row['area']}"))
                continue

            get_datetime = timezone.localtime(row['get_datetime'])
            weather_datetime = timezone.localtime(row['weather_datetime'])
            key = (get_datetime, weather_datetime, area.id, row['city'])

            forecast_data = {
                'get_datetime': get_datetime, # 預測時間
                'weather_datetime': weather_datetime, # 目標時間
                'area': area,
                'temperature': row['temperature'],
                'rainfall': row['rainfall'],
                'snowfall': row['snowfall'],
                'wind_speed': row['wind_speed'],
                'wind_direction': row['wind_direction'],
                'relative_humidity': row['relative_humidity'],
                'weather_id': row['weather_id'],
                'city': row['city'],
                'clouds_all': row['clouds_all'],
            }

            if key in existing_forecasts:
                # 如果已存在，更新
                existing_forecast = existing_forecasts[key]
                for field, value in forecast_data.items():
                    setattr(existing_forecast, field, value)
                forecasts_to_update.append(existing_forecast)
            else:
                # 如果不存在，新增
                forecasts_to_create.append(WeatherForecast(**forecast_data))

        # 批量創建新的資料
        if forecasts_to_create:
            self.stdout.write(
                self.style.WARNING(
                    f"正在建立 {len(forecasts_to_create)} 筆新的天氣預測資料..."
                )
            )
            WeatherForecast.objects.bulk_create(
                forecasts_to_create,
                batch_size=1000,
            )

        # 批量更新現有的資料
        if forecasts_to_update:
            self.stdout.write(
                self.style.WARNING(
                    f"正在更新 {len(forecasts_to_update)} 筆現有的天氣預測資料..."
                )
            )
            WeatherForecast.objects.bulk_update(
                forecasts_to_update,
                [
                    'temperature', 'rainfall', 'snowfall', 
                    'wind_speed', 'wind_direction', 
                    'relative_humidity', 'weather_id', 'city', 'clouds_all'
                ],
                batch_size=1000
            )

        self.stdout.write(self.style.SUCCESS("資料寫入完成！"))

    def handle(self, *args, **options):
        from_date = options['from_date']
        to_date = options['to_date']
        page_size = options['page_size']

        # 設定 API 認證資訊
        username = settings.QUICK_API_USERNAME
        password = settings.QUICK_API_PASSWORD

        self.stdout.write("開始取得天氣預測資料...")
        
        try:
            # 取得資料
            df = self.fetch_all_weather_forecasts(username, password, from_date, to_date, page_size)
            
            # 顯示資料基本資訊
            self.stdout.write(
                self.style.SUCCESS(
                    f"取得資料筆數: {len(df)}\n"
                    f"預測資料期間: {df['weather_datetime'].min()} 到 {df['weather_datetime'].max()}\n"
                    f"預測時間範圍: {df['get_datetime'].min()} 到 {df['get_datetime'].max()}"
                )
            )

            # 寫入資料庫
            self.save_to_database(df)

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"執行過程中發生錯誤: {str(e)}"))
            raise
