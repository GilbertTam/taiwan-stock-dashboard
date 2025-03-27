import datetime
import time
import pandas as pd
from tqdm import tqdm
from django.core.management.base import BaseCommand
from django.db import transaction
from django.conf import settings

from quick_api.quickapi import QuickAPI
from area.models import Area
from area.constants import AREA_EN_CH_MAP, AREA_EN_JP_MAP
from spot_market.models import SpotTrade, AreaPrice

class Command(BaseCommand):
    help = '從 QUICK API 下載現貨市場資料並儲存到資料庫'

    def add_arguments(self, parser):
        parser.add_argument('from_date', type=str, help='開始日期 (YYYYMMDD)')
        parser.add_argument('to_date', type=str, help='結束日期 (YYYYMMDD)')
        parser.add_argument(
            '--days-interval',
            type=int,
            default=30,
            help='每次請求的天數間隔'
        )
        parser.add_argument(
            '--page-size',
            type=int,
            default=10000,
            help='每頁資料筆數'
        )

    def generate_date_pairs(self, from_date: str, to_date: str, days_interval: int = 30) -> list:
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

    def fetch_all_spot_market_data(
        self,
        username: str,
        password: str, 
        from_date: str,
        to_date: str,
        days_interval: int = 30,
        page_size: int = 10000
    ) -> pd.DataFrame:
        """取得指定期間內的所有現貨市場資料"""
        all_results = []
        date_pairs = self.generate_date_pairs(from_date, to_date, days_interval)
        

        for start_date, end_date in tqdm(date_pairs, desc="下載資料進度"):
            page = 1
            max_retries = 3
            retry_delay = 5
            
            while True:
                retry_count = 0
                while retry_count < max_retries:
                    try:
                        self.stdout.write(f"正在取得 {start_date} 到 {end_date} 的第 {page} 頁資料")
                        with QuickAPI(username=username, password=password) as api:
                            result = api.jepx.get_spot_market_data(
                                from_date=start_date,
                                to_date=end_date,
                                time_code=[n for n in range(1, 49)],
                                fuel_adjustment=False,
                                weekends_holidays=api.jepx.weekends_holidays.INCLUDE,
                                page=page,
                                page_size=page_size
                            )
                        all_results.extend(result['results'])
                        self.stdout.write(f"取得 {len(result['results'])} 筆資料，目前總共 {len(all_results)} 筆")
                        
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
            
        df['trade_date'] = pd.to_datetime(df['trade_date'])
        df = df.sort_values(['trade_date', 'time_code']).reset_index(drop=True)
        
        return df

    @transaction.atomic
    def save_to_database(self, df: pd.DataFrame):
        """將資料儲存到資料庫"""
        self.stdout.write("開始儲存資料到資料庫...")

        df.rename(columns={
            'eria_price_touhoku': 'eria_price_tohoku',
            'aboidable_cost_touhoku': 'aboidable_cost_tohoku',
        }, inplace=True)
            
        # ===========================
        # 從df的columns取得所有區域（eria_price_開頭的欄位）
        # 並將區域名稱轉換為小寫
        areas = [
            col.split('_')[2].lower() for col in df.columns
            if col.startswith('eria_price_')
        ]
        areas = list(set(areas))  # 去除重複的區域名稱
        self.stdout.write(f"區域列表: {areas}")
        # 確保區域存在於資料庫中
        area_objects = []
        areas_dict = {}
        for area in areas:
            area_obj, created = Area.objects.get_or_create(
                name=area,
                defaults={
                    'name_ch': AREA_EN_CH_MAP.get(area, ''),
                    'name_jp': AREA_EN_JP_MAP.get(area, '')
                }
            )
            area_objects.append(area_obj)
            areas_dict[area] = area_obj

        self.stdout.write(f"區域資料庫中存在的區域數量: {len(area_objects)}")
        # ==========================

        # 取得現有的 SpotTrade 記錄
        existing_trades = {
            (trade.trade_date, trade.time_code): trade
            for trade in SpotTrade.objects.filter(
                trade_date__gte=df['trade_date'].min(),
                trade_date__lte=df['trade_date'].max()
            )
        }
        self.stdout.write(f"現有交易記錄數量: {len(existing_trades)}")

        # 分別準備要更新和創建的記錄
        trades_to_update = []
        trades_to_create = []
        
        for _, row in tqdm(df.iterrows(), total=len(df), desc="處理交易資料"):
            key = (row['trade_date'].to_pydatetime().date(), row['time_code'])
            trade_data = {
                'trade_date': row['trade_date'],
                'time_code': row['time_code'],
                'sell_quantity': row['sell_quantity'],
                'buy_quantity': row['buy_quantity'],
                'contract_quantity': row['contract_quantity'],
                'system_price': row['system_price']
            }

            if key in existing_trades:
                trade = existing_trades[key]
                for field, value in trade_data.items():
                    setattr(trade, field, value)
                trades_to_update.append(trade)
            else:
                trades_to_create.append(SpotTrade(**trade_data))
        
        # 批量創建新記錄
        if trades_to_create:
            SpotTrade.objects.bulk_create(trades_to_create, batch_size=1000)
        
        # 批量更新現有記錄
        if trades_to_update:
            SpotTrade.objects.bulk_update(
                trades_to_update,
                ['sell_quantity', 'buy_quantity', 'contract_quantity', 'system_price'],
                batch_size=1000
            )

        # 更新所有交易記錄的查詢集
        all_trades = {
            (trade.trade_date, trade.time_code): trade
            for trade in SpotTrade.objects.filter(
                trade_date__gte=df['trade_date'].min(),
                trade_date__lte=df['trade_date'].max()
            )
        }
        
        # 處理區域價格
        existing_prices = {
            (price.spot_trade_id, price.area_id): price
            for price in AreaPrice.objects.filter(
                spot_trade__trade_date__gte=df['trade_date'].min(),
                spot_trade__trade_date__lte=df['trade_date'].max()
            )
        }
        
        area_prices_to_update = []
        area_prices_to_create = []

        for _, row in tqdm(df.iterrows(), total=len(df), desc="處理區域價格"):
            trade = all_trades.get((row['trade_date'].to_pydatetime().date(), row['time_code']))

            if not trade:
                continue

            for area in areas:
                price_key = f'eria_price_{area.lower()}'
                cost_key = f'aboidable_cost_{area.lower()}'
                
                if price_key in row and cost_key in row:
                    key = (trade.id, areas_dict[area].id)
                    # 檢查price與cost是否為NaN
                    price = row[price_key]
                    cost = row[cost_key]

                    # 如果price或cost為NaN，則將其設為0
                    if pd.isna(price):
                        price = 0.
                    if pd.isna(cost):
                        cost = 0.

                    area_price_data = {
                        'spot_trade': trade,
                        'area': areas_dict[area],
                        'price': price,
                        'avoidable_cost': cost,
                    }

                    if key in existing_prices:
                        # 更新現有的價格資料
                        area_price = existing_prices[key]
                        area_price.price = price
                        area_price.avoidable_cost = cost
                        area_prices_to_update.append(area_price)
                    else:
                        # 創建新的價格資料
                        area_prices_to_create.append(AreaPrice(**area_price_data))

                    if len(area_prices_to_create) >= 1000:
                        AreaPrice.objects.bulk_create(area_prices_to_create)
                        area_prices_to_create = []
                    if len(area_prices_to_update) >= 1000:
                        AreaPrice.objects.bulk_update(
                            area_prices_to_update,
                            ['price', 'avoidable_cost']
                        )
                        area_prices_to_update = []

        # 處理剩餘的記錄
        if area_prices_to_create:
            AreaPrice.objects.bulk_create(area_prices_to_create)
        if area_prices_to_update:
            AreaPrice.objects.bulk_update(area_prices_to_update, ['price', 'avoidable_cost'])

    def handle(self, *args, **options):
        from_date = options['from_date']
        to_date = options['to_date']
        days_interval = options['days_interval']
        page_size = options['page_size']

        # 設定 API 認證資訊
        username = settings.QUICK_API_USERNAME
        password = settings.QUICK_API_PASSWORD

        self.stdout.write("開始取得現貨市場資料...")
        df = self.fetch_all_spot_market_data(
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
            f"資料期間: {df['trade_date'].min()} 到 {df['trade_date'].max()}"
        ))

        # 儲存到資料庫
        self.save_to_database(df)

        self.stdout.write(self.style.SUCCESS("資料處理完成"))
