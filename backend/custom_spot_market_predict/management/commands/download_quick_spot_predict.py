import datetime
import time
import pandas as pd
from tqdm import tqdm
from django.core.management.base import BaseCommand
from django.db import transaction
from django.conf import settings
from loguru import logger

from quick_api.quickapi import QuickAPI
from area.models import Area
from custom_spot_market_predict.models import PredictionModel, CustomAreaPricePredict

class Command(BaseCommand):
    help = '從 QUICK API 下載現貨市場預測資料並儲存到自定義預測模型資料庫'

    def add_arguments(self, parser):
        parser.add_argument('from_date', type=str, help='開始日期 (YYYYMMDD)')
        parser.add_argument('to_date', type=str, help='結束日期 (YYYYMMDD)')
        parser.add_argument(
            '--model-name',
            type=str,
            default='QUICK',
            help='預測模型名稱'
        )
        parser.add_argument(
            '--model-version',
            type=str,
            default='1.0.0',
            help='預測模型版本'
        )
        parser.add_argument(
            '--days-interval',
            type=int,
            default=7,
            help='每次請求的天數間隔'
        )
        parser.add_argument(
            '--page-size',
            type=int,
            default=30000, # 一次最多取得 X 筆資料
            help='每頁資料筆數'
        )

    def generate_date_pairs(self, from_date: str, to_date: str, days_interval: int = 14) -> list:
        """生成日期區間pairs"""
        start_datetime = datetime.datetime.strptime(from_date, "%Y%m%d")
        end_datetime = datetime.datetime.strptime(to_date, "%Y%m%d")
        
        date_pairs = []
        current_start = start_datetime
        
        while current_start <= end_datetime:
            current_end = min(current_start + datetime.timedelta(days=days_interval-1), end_datetime)
            date_pairs.append((
                current_start.strftime("%Y%m%d"),
                current_end.strftime("%Y%m%d")
            ))
            current_start = current_end + datetime.timedelta(days=1)

        return date_pairs

    def fetch_all_spot_price_predictions(
        self,
        username: str,
        password: str, 
        from_date: str,
        to_date: str,
        days_interval: int = 7,
        page_size: int = 30000,
    ) -> pd.DataFrame:
        """取得指定條件的所有電力現貨價格預測資料"""
        all_results = []
        date_pairs = self.generate_date_pairs(from_date, to_date, days_interval)

        with QuickAPI(username=username, password=password) as api:

            for start_date, end_date in tqdm(date_pairs, desc="下載資料進度"):
                page = 1
                max_retries = 3
                retry_delay = 5
                
                while True:
                    retry_count = 0
                    while retry_count < max_retries:
                        try:
                            start_time = time.time()
                            self.stdout.write(f"正在取得 {start_date} 到 {end_date} 的第 {page} 頁預測資料")
                            result = api.price_predict.get_spot_power_price_prediction(
                                from_date=start_date,
                                to_date=end_date,
                                time_code=[n for n in range(1, 49)],
                                page=str(page),
                                page_size=page_size
                            )
                            all_results.extend(result['results'])
                            end_time = time.time()
                            self.stdout.write(f"取得 {len(result['results'])} 筆資料，耗時 {end_time - start_time:.2f} 秒")
                            
                            if not result['next']:
                                break

                            page += 1
                            break

                        except Exception as e:
                            retry_count += 1
                            if retry_count < max_retries:
                                self.stdout.write(self.style.WARNING(
                                    f"第 {retry_count} 次嘗試失敗: {str(e)}，{retry_delay} 秒後重試..."
                                ))
                                time.sleep(retry_delay)
                            else:
                                self.stdout.write(self.style.ERROR(
                                    f"已重試 {max_retries} 次仍然失敗: {str(e)}"
                                ))
                                break
                    
                    if retry_count >= max_retries or not result['next']:
                        break

            df = pd.DataFrame(all_results)
            
            if len(df) == 0:
                self.stdout.write(self.style.WARNING("未取得任何資料"))
                return pd.DataFrame()

            df['calculating_date'] = pd.to_datetime(df['calculating_date'])
            df['target_datetime'] = pd.to_datetime(df['target_datetime'])
            df = df.sort_values(['target_datetime', 'time_code', 'calculating_date']).reset_index(drop=True)

            # 轉換 name_jp 為對應的 name
            df['price_type'] = df['price_type'].map({area.name_jp: area.name for area in Area.objects.all()})

        return df

    @transaction.atomic
    def save_to_database(self, df: pd.DataFrame, model_name: str, model_version: str):
        """將資料儲存到資料庫"""
        self.stdout.write("開始儲存資料到資料庫...")

        # 獲取或創建預測模型
        prediction_model, created = PredictionModel.objects.get_or_create(
            name=model_name,
            version=model_version,
            defaults={
                'description': f'從 QUICK API 下載的預測資料 (下載時間: {datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")})'
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'創建了新的預測模型: {model_name} v{model_version}'))
        else:
            self.stdout.write(self.style.SUCCESS(f'使用現有預測模型: {model_name} v{model_version}'))

        # 取得地區
        area_objects = {area.name: area for area in Area.objects.all()}

        # 取得現有的價格預測記錄
        existing_prices = {
            (price.trade_date, price.time_code, price.area_id, price.calculating_date): price
            for price in CustomAreaPricePredict.objects.filter(
                model=prediction_model,
                trade_date__gte=df['target_datetime'].min().date(),
                trade_date__lte=df['target_datetime'].max().date()
            )
        }
        
        self.stdout.write(f"現有資料筆數: {len(existing_prices)}")
        self.stdout.write(f"從API取得資料筆數: {len(df)}")
        
        # 初始化要新增和更新的列表
        prices_to_create = []
        prices_to_update = []

        # 處理每筆預測資料
        for _, row in tqdm(df.iterrows(), total=len(df), desc="處理價格預測"):
            trade_date = row['target_datetime'].date()
            time_code = row['time_code']
            area = row['price_type']
            area_object = area_objects.get(area)
            if not area_object:
                self.stdout.write(self.style.WARNING(f"找不到對應的區域: {row['price_type']}"))
                continue

            key = (trade_date, time_code, area_object.id, row['calculating_date'].date())
            
            # 創建額外數據
            additional_data = {
                "source": "QUICK API",
                "metadata": {
                    "downloaded_at": datetime.datetime.now().isoformat(),
                }
            }
            
            price_data = {
                'model': prediction_model,
                'trade_date': trade_date,
                'time_code': time_code,
                'area': area_object,
                'calculating_date': row['calculating_date'].date(),
                'price_5': row['price_5'],
                'price_50': row['price_50'],
                'price_95': row['price_95'],
                'additional_data': additional_data
            }

            if key in existing_prices:
                price = existing_prices[key]
                price.price_5 = row['price_5']
                price.price_50 = row['price_50']
                price.price_95 = row['price_95']
                price.additional_data = additional_data
                prices_to_update.append(price)
            else:
                prices_to_create.append(CustomAreaPricePredict(**price_data))

            # 批量處理以節省記憶體
            if len(prices_to_create) >= 2000:
                CustomAreaPricePredict.objects.bulk_create(prices_to_create, ignore_conflicts=True)
                prices_to_create = []
            if len(prices_to_update) >= 2000:
                CustomAreaPricePredict.objects.bulk_update(
                    prices_to_update,
                    ['price_5', 'price_50', 'price_95', 'additional_data']
                )
                prices_to_update = []

        # 處理剩餘的記錄
        if prices_to_create:
            CustomAreaPricePredict.objects.bulk_create(prices_to_create, ignore_conflicts=True)
        if prices_to_update:
            CustomAreaPricePredict.objects.bulk_update(
                prices_to_update,
                ['price_5', 'price_50', 'price_95', 'additional_data']
            )

    def handle(self, *args, **options):
        from_date = options['from_date']
        to_date = options['to_date']
        days_interval = options['days_interval']
        page_size = options['page_size']
        model_name = options['model_name']
        model_version = options['model_version']

        # 設定 API 認證資訊
        username = settings.QUICK_API_USERNAME
        password = settings.QUICK_API_PASSWORD

        self.stdout.write("開始取得現貨市場預測資料...")
        df = self.fetch_all_spot_price_predictions(
            username,
            password,
            from_date,
            to_date,
            days_interval,
            page_size
        )

        if len(df) == 0:
            self.stdout.write(self.style.ERROR("未取得資料，程序終止"))
            return

        self.stdout.write(self.style.SUCCESS(
            f"取得資料筆數: {len(df)}\n"
            f"資料期間: {df['calculating_date'].min()} 到 {df['calculating_date'].max()}"
        ))

        # 儲存到資料庫
        self.save_to_database(df, model_name, model_version)

        self.stdout.write(self.style.SUCCESS("資料處理完成"))
