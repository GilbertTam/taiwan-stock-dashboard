import random
import datetime
from decimal import Decimal
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from django.db.models import Q
import numpy as np
from tqdm import tqdm

# 導入相關模型
from spot_market.models import SpotTrade, AreaPrice
from area.models import Area
from custom_spot_market_predict.models import PredictionModel, CustomAreaPricePredict

class Command(BaseCommand):
    help = '基於現貨市場資料生成測試預測資料'

    def add_arguments(self, parser):
        parser.add_argument(
            '--model_name',
            type=str,
            default='TestModel',
            help='預測模型名稱'
        )
        parser.add_argument(
            '--model_version',
            type=str,
            default='1.0.0',
            help='預測模型版本'
        )
        parser.add_argument(
            '--start_date',
            type=str,
            help='開始日期 (YYYY-MM-DD)，預設為今天減去7天'
        )
        parser.add_argument(
            '--end_date',
            type=str,
            help='結束日期 (YYYY-MM-DD)，預設為今天'
        )
        parser.add_argument(
            '--days_ahead',
            type=int,
            default=1,
            help='預測提前天數 (預設為1天，即D+1預測)'
        )
        parser.add_argument(
            '--calculating_dates',
            type=int,
            default=3,
            help='每個交易日生成的計算日期數量 (預設為3)'
        )
        parser.add_argument(
            '--error_range',
            type=float,
            default=0.15,
            help='預測誤差範圍 (預設為15%)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='清除指定模型的所有現有預測資料'
        )

    def handle(self, *args, **options):
        model_name = options['model_name']
        model_version = options['model_version']
        days_ahead = options['days_ahead']
        calculating_dates = options['calculating_dates']
        error_range = options['error_range']
        clear = options['clear']
        
        # 解析日期範圍
        today = timezone.now().date()
        
        # 預設為今天和前7天
        start_date = today - datetime.timedelta(days=7)
        end_date = today
        
        if options['start_date']:
            try:
                start_date = datetime.datetime.strptime(options['start_date'], '%Y-%m-%d').date()
            except ValueError:
                raise CommandError('開始日期格式錯誤，應為 YYYY-MM-DD')
        
        if options['end_date']:
            try:
                end_date = datetime.datetime.strptime(options['end_date'], '%Y-%m-%d').date()
            except ValueError:
                raise CommandError('結束日期格式錯誤，應為 YYYY-MM-DD')
        
        # 確保日期範圍有效
        if start_date > end_date:
            raise CommandError('開始日期不能晚於結束日期')
        
        # 檢查日期範圍內是否有現貨市場資料
        spot_data_exists = SpotTrade.objects.filter(
            trade_date__gte=start_date,
            trade_date__lte=end_date
        ).exists()
        
        if not spot_data_exists:
            raise CommandError(f'指定日期範圍 ({start_date} 到 {end_date}) 內沒有現貨市場資料')
        
        # 獲取或建立預測模型
        prediction_model, created = PredictionModel.objects.get_or_create(
            name=model_name,
            version=model_version,
            defaults={
                'description': f'由 generate_test_predictions 建立的測試模型'
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'建立了新的預測模型: {model_name} v{model_version}'))
        else:
            self.stdout.write(self.style.SUCCESS(f'使用現有預測模型: {model_name} v{model_version}'))
        
        # 如果指定了清除選項，刪除該模型的所有現有預測
        if clear:
            deleted_count, _ = CustomAreaPricePredict.objects.filter(model=prediction_model).delete()
            self.stdout.write(self.style.WARNING(f'已刪除 {deleted_count} 條現有預測資料'))
        
        # 獲取所有區域
        areas = Area.objects.all()
        if not areas.exists():
            raise CommandError('資料庫中沒有區域資料')
        
        # 計算日期範圍
        current_date = start_date
        date_list = []
        while current_date <= end_date:
            date_list.append(current_date)
            current_date += datetime.timedelta(days=1)
        
        # 生成預測資料
        total_predictions = 0
        
        with transaction.atomic():
            for trade_date in tqdm(date_list, desc="生成預測資料"):
                # 獲取該交易日的所有現貨交易資料
                spot_trades = SpotTrade.objects.filter(trade_date=trade_date)
                
                if not spot_trades.exists():
                    self.stdout.write(self.style.WARNING(f'跳過 {trade_date}，沒有現貨交易資料'))
                    continue
                
                # 為每個計算日期生成預測
                for i in range(calculating_dates):
                    # 計算日期為交易日前 days_ahead + i 天
                    calculating_date = trade_date - datetime.timedelta(days=days_ahead + i)
                    
                    # 對每個時段和區域生成預測
                    for spot_trade in spot_trades:
                        # 獲取該時段的所有區域價格
                        area_prices = AreaPrice.objects.filter(spot_trade=spot_trade)
                        
                        if not area_prices.exists():
                            continue
                        
                        for area_price in area_prices:
                            # 生成預測值
                            # 預測誤差隨計算日期增加而增加
                            error_multiplier = 1 + (i * 0.5)  # 每增加一個計算日期，誤差增加50%
                            current_error_range = error_range * error_multiplier
                            
                            # 生成隨機誤差因子
                            error_factor_50 = random.uniform(1 - current_error_range, 1 + current_error_range)
                            
                            # P50 預測值
                            price_50 = Decimal(float(area_price.price) * error_factor_50).quantize(Decimal('0.01'))
                            
                            # P5 和 P95 預測值
                            # P5 比 P50 低 10-30%
                            p5_factor = random.uniform(0.7, 0.9)
                            price_5 = Decimal(float(price_50) * p5_factor).quantize(Decimal('0.01'))
                            
                            # P95 比 P50 高 10-30%
                            p95_factor = random.uniform(1.1, 1.3)
                            price_95 = Decimal(float(price_50) * p95_factor).quantize(Decimal('0.01'))
                            
                            # 生成額外數據
                            additional_data = {
                                "confidence": round(random.uniform(0.7, 0.95), 2),
                                "features": {
                                    "system_price": float(spot_trade.system_price),
                                    "contract_quantity": spot_trade.contract_quantity,
                                    "random_factor": round(random.uniform(0.8, 1.2), 2)
                                },
                                "metadata": {
                                    "generated_by": "test_data_generator",
                                    "generation_time": timezone.now().isoformat()
                                }
                            }
                            
                            # 建立或更新預測記錄
                            prediction, created = CustomAreaPricePredict.objects.update_or_create(
                                model=prediction_model,
                                trade_date=trade_date,
                                time_code=spot_trade.time_code,
                                area=area_price.area,
                                calculating_date=calculating_date,
                                defaults={
                                    'price_5': price_5,
                                    'price_50': price_50,
                                    'price_95': price_95,
                                    'additional_data': additional_data
                                }
                            )
                            
                            total_predictions += 1
        
        self.stdout.write(self.style.SUCCESS(f'成功生成 {total_predictions} 條預測資料'))
        self.stdout.write(self.style.SUCCESS(f'預測模型: {model_name} v{model_version}'))
        self.stdout.write(self.style.SUCCESS(f'日期範圍: {start_date} 到 {end_date}'))
        self.stdout.write(self.style.SUCCESS(f'每個交易日生成 {calculating_dates} 個計算日期的預測'))
