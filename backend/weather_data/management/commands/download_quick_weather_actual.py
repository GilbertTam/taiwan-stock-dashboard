import datetime
import pandas as pd
from tqdm import tqdm
import time

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings

from area.models import Area
from weather_data.models import ActualWeather
from quick_api.quickapi import QuickAPI

class Command(BaseCommand):
    help = '下載天氣實際資料並儲存到資料庫'

    def add_arguments(self, parser):
        parser.add_argument('from_date', type=str, help='開始日期 (YYYYMMDD)')
        parser.add_argument('to_date', type=str, help='結束日期 (YYYYMMDD)')

        parser.add_argument(
            '--page-size',
            type=int,
            default=5000,
            help='每頁資料筆數',
        )

    def fetch_all_weather_results(
        self,
        username: str, 
        password: str, 
        from_date: str,
        to_date: str,
        page_size: int = 5000
    ) -> pd.DataFrame:
        """取得天氣實際資料"""
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
        
            for date in tqdm(date_list, desc="下載天氣資料"):
                date = date - datetime.timedelta(hours=9)  # 調整時區
                from_datetime = date.strftime("%Y%m%d%H0000")
                to_datetime = (date + datetime.timedelta(hours=23)).strftime("%Y%m%d%H0000")

                max_retries = 3
                retry_delay = 5
                retry_count = 0
                
                while retry_count < max_retries:
                    try:
                        with QuickAPI(username=username, password=password) as api:
                            result = api.weather.get_weather_results(
                                from_datetime=from_datetime,
                                to_datetime=to_datetime,
                                area=area_name_jp,
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
        df['weather_datetime'] = pd.to_datetime(df['weather_datetime'])
        df = df.sort_values(['weather_datetime']).reset_index(drop=True)
        #df = df.drop_duplicates('weather_datetime', keep='last').reset_index(drop=True)
        return df

    def save_to_database(self, df: pd.DataFrame):
        """將資料儲存到資料庫"""
        self.stdout.write("開始寫入資料庫...")
        
        # 取得區域名稱對應的 Area 物件
        area_dicts = {area.name_jp:area for area in Area.objects.all()}

        # 取得現有的實際天氣資料
        existing_weather = {
            (timezone.localtime(weather_data.weather_datetime), weather_data.area_id, weather_data.city): weather_data
            for weather_data in ActualWeather.objects.filter(
                weather_datetime__range=(
                    df['weather_datetime'].min(),
                    df['weather_datetime'].max()
                )
            )
        }

        # 準備批量創建的物件列表
        weather_to_create = []
        weather_to_update = []

        total_rows = len(df)
        
        for _, row in tqdm(df.iterrows(), total=total_rows, desc="處理資料"):
            area = area_dicts.get(row['area'])
            if area is None:
                self.stdout.write(self.style.WARNING(f"找不到區域: {row['area']}"))
                continue
            weather_datetime = timezone.localtime(row['weather_datetime'])
            key = (weather_datetime, area.id, row['city'])

            weather_data = {
                'weather_datetime': weather_datetime,
                'area': area,
                'temperature': row['temperature'],
                'rainfall': row['rainfall'],
                'snowfall': row['snowfall'],
                'deepest_snow': row['deepest_snow'],
                'sunshine_hours': row['sunshine_hours'],
                'wind_speed': row['wind_speed'],
                'wind_direction': row['wind_direction'],
                'relative_humidity': row['relative_humidity'],
                'weather_id': row['weather_id'],
                'city': row['city'],
                'source': 'quick',
            }

            if key in existing_weather:
                # 如果已存在，更新
                existing_weather_data = existing_weather[key]
                for field, value in weather_data.items():
                    setattr(existing_weather_data, field, value)
                weather_to_update.append(existing_weather_data)
            else:
                # 如果不存在，新增
                weather_to_create.append(ActualWeather(**weather_data))

        # 批量創建新的資料
        if weather_to_create:
            # 提示建立資料的數量
            self.stdout.write(
                self.style.WARNING(
                    f"正在建立 {len(weather_to_create)} 筆新的天氣實際資料..."
                )
            )
            # 使用 bulk_create 來批量創建資料
            ActualWeather.objects.bulk_create(
                weather_to_create,
                batch_size=1000,
            )

        # 批量更新現有的資料
        if weather_to_update:
            # 提示更新資料的數量
            self.stdout.write(
                self.style.WARNING(
                    f"正在更新 {len(weather_to_update)} 筆現有的天氣實際資料..."
                )
            )
            # 使用 bulk_update 來批量更新資料
            ActualWeather.objects.bulk_update(
                weather_to_update,
                [
                    'temperature', 'rainfall', 'snowfall', 
                    'deepest_snow', 'sunshine_hours', 
                    'wind_speed', 'wind_direction', 
                    'relative_humidity', 'weather_id'
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

        self.stdout.write("開始取得天氣實際資料...")
        
        try:
            # 取得資料
            df = self.fetch_all_weather_results(username, password, from_date, to_date, page_size)
            
            # 顯示資料基本資訊
            self.stdout.write(
                self.style.SUCCESS(
                    f"取得資料筆數: {len(df)}\n"
                    f"實際天氣資料期間: {df['weather_datetime'].min()} 到 {df['weather_datetime'].max()}"
                )
            )

            # 寫入資料庫
            self.save_to_database(df)

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"執行過程中發生錯誤: {str(e)}"))
            raise
