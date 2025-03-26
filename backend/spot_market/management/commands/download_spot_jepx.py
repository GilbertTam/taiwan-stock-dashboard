import io
import requests
import pandas as pd
from tqdm import tqdm
from django.core.management.base import BaseCommand
from django.db import transaction

from area.models import Area
from area.constants import AREA_EN_CH_MAP, AREA_EN_JP_MAP
from spot_market.models import SpotTrade, AreaPrice

class Command(BaseCommand):
    help = '從 JEPX 網站下載現貨市場 CSV 資料並儲存到資料庫（每年是從四月開始）'

    def add_arguments(self, parser):
        parser.add_argument('year', type=str, help='要下載的年份 (YYYY)')
        parser.add_argument(
            '--batch-size',
            type=int,
            default=10000,
            help='批量處理的記錄數量'
        )

    def fetch_jepx_csv_data(self, year):
        """從 JEPX 網站下載 CSV 資料"""
        self.stdout.write(f"正在從 JEPX 網站下載 {year} 年的資料...")
        
        url = f'https://www.jepx.jp/js/csv_read.php?dir=spot_summary&file=spot_summary_{year}.csv'
        headers = {
            'accept': '*/*',
            'accept-language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
            'cache-control': 'no-cache',
            'if-modified-since': 'Thu, 01 Jun 1970 00:00:00 GMT',
            'pragma': 'no-cache',
            'referer': 'https://www.jepx.jp/electricpower/market-data/spot/',
            'sec-ch-ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
        }
        
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()  # 檢查是否成功獲取資料

            content = response.content.decode()
            return content
            
        except requests.exceptions.RequestException as e:
            self.stdout.write(self.style.ERROR(f"下載資料失敗: {str(e)}"))
            return None

    def parse_csv_data(self, csv_content):
        """解析 CSV 資料為 DataFrame"""
        if not csv_content:
            return pd.DataFrame()
            
        # 使用 StringIO 將字符串轉換為類文件對象
        csv_file = io.StringIO(csv_content)
        
        # 讀取 CSV 資料
        df = pd.read_csv(csv_file)
        
        # 重命名列以符合我們的資料結構
        column_mapping = {
            '受渡日': 'trade_date',
            '時刻コード': 'time_code',
            '売り入札量(kWh)': 'sell_quantity',
            '買い入札量(kWh)': 'buy_quantity',
            '約定総量(kWh)': 'contract_quantity',
            'システムプライス(円/kWh)': 'system_price',
            'エリアプライス北海道(円/kWh)': 'area_price_hokkaido',
            'エリアプライス東北(円/kWh)': 'area_price_tohoku',
            'エリアプライス東京(円/kWh)': 'area_price_tokyo',
            'エリアプライス中部(円/kWh)': 'area_price_chubu',
            'エリアプライス北陸(円/kWh)': 'area_price_hokuriku',
            'エリアプライス関西(円/kWh)': 'area_price_kansai',
            'エリアプライス中国(円/kWh)': 'area_price_chugoku',
            'エリアプライス四国(円/kWh)': 'area_price_shikoku',
            'エリアプライス九州(円/kWh)': 'area_price_kyushu'
        }
        
        df = df.rename(columns=column_mapping)
        
        # 轉換日期格式
        df['trade_date'] = pd.to_datetime(df['trade_date'])
        
        return df

    def setup_areas(self):
        """設置區域資料，使用已有的 AREA_EN_CH_MAP 和 AREA_EN_JP_MAP"""
        # 確保區域存在於資料庫中
        area_objects = {}
        for area_name in AREA_EN_CH_MAP.keys():
            area_obj, created = Area.objects.get_or_create(
                name=area_name,
                defaults={
                    'name_ch': AREA_EN_CH_MAP.get(area_name, ''),
                    'name_jp': AREA_EN_JP_MAP.get(area_name, '')
                }
            )
            area_objects[area_name] = area_obj
            
            if created:
                self.stdout.write(f"創建新區域: {area_name}")
                
        return area_objects

    @transaction.atomic
    def save_to_database(self, df, areas_dict, batch_size=10000):
        """將資料儲存到資料庫"""
        if len(df) == 0:
            self.stdout.write(self.style.WARNING("沒有資料需要儲存"))
            return
            
        self.stdout.write("開始儲存資料到資料庫...")
        
        # 取得現有的 SpotTrade 記錄
        existing_trades = {
            (trade.trade_date, trade.time_code): trade
            for trade in SpotTrade.objects.filter(
                trade_date__gte=df['trade_date'].min().date(),
                trade_date__lte=df['trade_date'].max().date()
            )
        }
        self.stdout.write(f"現有交易記錄數量: {len(existing_trades)}")

        # 分別準備要更新和創建的記錄
        trades_to_update = []
        trades_to_create = []
        
        for _, row in tqdm(df.iterrows(), total=len(df), desc="處理交易資料"):
            key = (row['trade_date'].date(), row['time_code'])
            trade_data = {
                'trade_date': row['trade_date'].date(),
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
                
            # 批量處理
            if len(trades_to_create) >= batch_size:
                SpotTrade.objects.bulk_create(trades_to_create)
                self.stdout.write(f"已創建 {len(trades_to_create)} 筆交易記錄")
                trades_to_create = []
                
            if len(trades_to_update) >= batch_size:
                SpotTrade.objects.bulk_update(
                    trades_to_update,
                    ['sell_quantity', 'buy_quantity', 'contract_quantity', 'system_price']
                )
                self.stdout.write(f"已更新 {len(trades_to_update)} 筆交易記錄")
                trades_to_update = []
        
        # 處理剩餘的記錄
        if trades_to_create:
            SpotTrade.objects.bulk_create(trades_to_create)
            self.stdout.write(f"已創建 {len(trades_to_create)} 筆交易記錄")
            
        if trades_to_update:
            SpotTrade.objects.bulk_update(
                trades_to_update,
                ['sell_quantity', 'buy_quantity', 'contract_quantity', 'system_price']
            )
            self.stdout.write(f"已更新 {len(trades_to_update)} 筆交易記錄")

        # 更新所有交易記錄的查詢集
        all_trades = {
            (trade.trade_date, trade.time_code): trade
            for trade in SpotTrade.objects.filter(
                trade_date__gte=df['trade_date'].min().date(),
                trade_date__lte=df['trade_date'].max().date()
            )
        }
        
        # 處理區域價格
        existing_prices = {
            (price.spot_trade_id, price.area_id): price
            for price in AreaPrice.objects.filter(
                spot_trade__trade_date__gte=df['trade_date'].min().date(),
                spot_trade__trade_date__lte=df['trade_date'].max().date()
            )
        }
        
        area_prices_to_update = []
        area_prices_to_create = []

        for _, row in tqdm(df.iterrows(), total=len(df), desc="處理區域價格"):
            trade = all_trades.get((row['trade_date'].date(), row['time_code']))

            if not trade:
                continue

            for area_name, area_obj in areas_dict.items():
                price_column = f'area_price_{area_name}'
                
                if price_column in row:
                    price_value = row[price_column]
                    
                    # 檢查價格是否為 NaN
                    if pd.isna(price_value):
                        price_value = 0.0
                        
                    key = (trade.id, area_obj.id)
                    
                    if key in existing_prices:
                        # 更新現有的價格資料
                        area_price = existing_prices[key]
                        area_price.price = price_value
                        area_prices_to_update.append(area_price)
                    else:
                        # 創建新的價格資料
                        area_prices_to_create.append(AreaPrice(
                            spot_trade=trade,
                            area=area_obj,
                            price=price_value,
                            avoidable_cost=0.0  # 根據 CSV 資料中沒有可避免成本，設為 0
                        ))

                    # 批量處理
                    if len(area_prices_to_create) >= batch_size:
                        AreaPrice.objects.bulk_create(area_prices_to_create)
                        self.stdout.write(f"已創建 {len(area_prices_to_create)} 筆區域價格記錄")
                        area_prices_to_create = []
                        
                    if len(area_prices_to_update) >= batch_size:
                        AreaPrice.objects.bulk_update(area_prices_to_update, ['price'])
                        self.stdout.write(f"已更新 {len(area_prices_to_update)} 筆區域價格記錄")
                        area_prices_to_update = []

        # 處理剩餘的記錄
        if area_prices_to_create:
            AreaPrice.objects.bulk_create(area_prices_to_create)
            self.stdout.write(f"已創建 {len(area_prices_to_create)} 筆區域價格記錄")
            
        if area_prices_to_update:
            AreaPrice.objects.bulk_update(area_prices_to_update, ['price'])
            self.stdout.write(f"已更新 {len(area_prices_to_update)} 筆區域價格記錄")

    def handle(self, *args, **options):
        year = options['year']
        batch_size = options['batch_size']
        
        # 下載 CSV 資料
        csv_content = self.fetch_jepx_csv_data(year)
        
        if not csv_content:
            self.stdout.write(self.style.ERROR("未能獲取資料，程序終止"))
            return
            
        # 解析 CSV 資料
        df = self.parse_csv_data(csv_content)
        
        if len(df) == 0:
            self.stdout.write(self.style.ERROR("未解析到任何資料，程序終止"))
            return
            
        self.stdout.write(self.style.SUCCESS(
            f"解析資料筆數: {len(df)}\n"
            f"資料期間: {df['trade_date'].min().date()} 到 {df['trade_date'].max().date()}"
        ))
        
        # 設置區域
        areas_dict = self.setup_areas()
        
        # 儲存到資料庫
        self.save_to_database(df, areas_dict, batch_size)
        
        self.stdout.write(self.style.SUCCESS("資料處理完成"))
