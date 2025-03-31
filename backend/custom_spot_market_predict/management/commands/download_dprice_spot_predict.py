import re
import json
import requests
from datetime import datetime
import pandas as pd
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from area.models import Area
from area.constants import AREA_EN_JP_MAP
from custom_spot_market_predict.models import PredictionModel, CustomAreaPricePredict


class Command(BaseCommand):
    help = '從D-Price網站抓取電力價格預測資料並存入資料庫'

    def add_arguments(self, parser):
        parser.add_argument(
            '--areas',
            nargs='+',
            type=str,
            help='要抓取的地區列表 (hokkaido, tohoku, tokyo, chubu, hokuriku, kansai, chugoku, shikoku, kyushu)，不指定則抓取所有地區',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='只顯示將要執行的操作，不實際寫入資料庫',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='顯示詳細日誌',
        )

    def handle(self, *args, **options):
        # 獲取或創建預測模型
        model, created = PredictionModel.objects.get_or_create(
            name='D-Price',
            version='1.0',
            defaults={
                'description': 'D-Price日本電力價格預測模型，來源: https://d-price-jepx.net/'
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f"創建了新的預測模型: {model}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"使用現有預測模型: {model}"))
        
        # 確定要抓取的地區
        areas_to_fetch = options['areas'] if options['areas'] else list(AREA_EN_JP_MAP.keys())
        
        # 統計資料
        stats = {
            'total': 0,
            'new': 0,
            'updated': 0,
            'unchanged': 0,
            'errors': 0
        }
        
        # 遍歷每個地區抓取資料
        for area_name in areas_to_fetch:
            if area_name not in AREA_EN_JP_MAP:
                self.stdout.write(self.style.WARNING(f"未知地區: {area_name}，跳過"))
                continue
                
            area_jp = AREA_EN_JP_MAP[area_name]
            
            try:
                # 獲取地區對象
                area = Area.objects.get(name=area_name)
                
                self.stdout.write(f"正在抓取 {area.name} ({area.name_ch}) 的預測資料...")
                
                # 抓取資料
                df, prediction_date = self.fetch_dprice_data(area_jp)
                
                if df is None:
                    self.stdout.write(self.style.ERROR(f"無法抓取 {area.name} 的資料"))
                    stats['errors'] += 1
                    continue
                
                # 處理資料並保存到資料庫
                if not options['dry_run']:
                    area_stats = self.process_and_save_data(df, model, area, prediction_date, options['verbose'])
                    for key in stats:
                        if key != 'total':
                            stats[key] += area_stats[key]
                    stats['total'] += len(df)
                else:
                    self.stdout.write(self.style.WARNING(f"乾跑模式：將處理 {len(df)} 條 {area.name} 的記錄"))
                    stats['total'] += len(df)
                
            except Area.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"資料庫中不存在地區: {area_name}"))
                stats['errors'] += 1
                continue
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"處理 {area_name} 時發生錯誤: {str(e)}"))
                stats['errors'] += 1
                continue
        
        # 輸出統計信息
        self.stdout.write(self.style.SUCCESS(
            f"完成! 總共處理 {stats['total']} 條記錄, "
            f"新增: {stats['new']}, "
            f"更新: {stats['updated']}, "
            f"未變更: {stats['unchanged']}, "
            f"錯誤: {stats['errors']}"
        ))

    def fetch_dprice_data(self, area_jp):
        """從D-Price網站抓取指定地區的資料"""
        # 設定請求頭和　
        headers = {
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'accept-language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
            'cache-control': 'no-cache',
            'content-type': 'application/x-www-form-urlencoded',
            'origin': 'https://d-price-jepx.net',
            'pragma': 'no-cache',
            'referer': 'https://d-price-jepx.net/d-price-past',
            'sec-ch-ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'same-origin',
            'upgrade-insecure-requests': '1',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
        }

        data = {
            'price_type': f'エリアプライス（{area_jp}）'
        }

        # 發送請求
        url = 'https://d-price-jepx.net/d-price-past'
        try:
            response = requests.post(url, headers=headers, data=data)
            response.raise_for_status()  # 如果請求失敗則拋出異常
            
            # 提取 sampleData 部分
            html_content = response.text
            
            # 提取預測生成時間
            prediction_date_pattern = r'予測作成日時：(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})'
            prediction_date_match = re.search(prediction_date_pattern, html_content)
            prediction_date = None
            if prediction_date_match:
                prediction_date = datetime.strptime(prediction_date_match.group(1), '%Y-%m-%d %H:%M:%S')
            else:
                prediction_date = timezone.now()
                self.stdout.write(self.style.WARNING(f"無法從網頁中提取預測時間，使用當前時間"))
            
            # 提取 sampleData
            pattern = r'const sampleData = (\{[\s\S]*?\});'
            match = re.search(pattern, html_content)
            
            if match:
                # 提取 JavaScript 對象字符串
                js_obj_str = match.group(1)
                
                # 將 JavaScript 對象轉換為有效的 JSON
                # 1. 將未加引號的鍵轉換為加引號的鍵
                json_str = re.sub(r'([{,]\s*)([a-zA-Z0-9_$]+)(\s*:)', r'\1"\2"\3', js_obj_str)
                
                # 2. 將所有單引號替換為雙引號
                json_str = json_str.replace("'", '"')
                
                # 3. 處理可能的尾隔逗號
                json_str = re.sub(r',\s*}', '}', json_str)
                json_str = re.sub(r',\s*]', ']', json_str)
                
                # 解析 JSON
                try:
                    data_dict = json.loads(json_str)
                    
                    # 創建 DataFrame
                    df = pd.DataFrame({
                        'datetime': data_dict['labels'],
                        'price_q2_5': data_dict['price_q2_5'],  # 95% 下限值
                        'price_q25': data_dict['price_q25'],    # 50% 下限值
                        'price_q50': data_dict['price_q50'],    # 預測值（中位數）
                        'price_q75': data_dict['price_q75'],    # 50% 上限值
                        'price_q97_5': data_dict['price_q97_5'],  # 95% 上限值
                        'system_price_real': data_dict['system_price_real']  # 實際值
                    })
                    
                    # 將 datetime 列轉換為 datetime 類型
                    df['datetime'] = pd.to_datetime(df['datetime'])
                    
                    return df, prediction_date
                    
                except json.JSONDecodeError as e:
                    self.stdout.write(self.style.ERROR(f"JSON 解析錯誤：{e}"))
                    self.stdout.write(self.style.ERROR(f"問題的 JSON 字符串：{json_str[:200]}..."))
                    return None, None
            else:
                self.stdout.write(self.style.ERROR(f"未找到 sampleData"))
                return None, None
                
        except requests.exceptions.RequestException as e:
            self.stdout.write(self.style.ERROR(f"請求錯誤：{e}"))
            return None, None

    @transaction.atomic
    def process_and_save_data(self, df, model, area, prediction_date, verbose=False):
        """處理並保存資料到資料庫"""
        stats = {
            'new': 0,
            'updated': 0,
            'unchanged': 0,
            'errors': 0
        }
        
        calculating_date = prediction_date.date()
        
        # 遍歷 DataFrame 的每一行
        for _, row in df.iterrows():
            trade_date = row['datetime'].date()
            
            # 計算時段代碼 (1-48)
            # 00:00 -> 1, 00:30 -> 2, 01:00 -> 3, ...
            hour = row['datetime'].hour
            minute = row['datetime'].minute
            time_code = hour * 2 + (1 if minute == 0 else 2)
            
            # 準備額外資料 - 包含所有預測區間和實際值
            additional_data = {
                'price_q2_5': float(row['price_q2_5']),  # 95% 下限值
                'price_q25': float(row['price_q25']),    # 50% 下限值
                'price_q75': float(row['price_q75']),    # 50% 上限值
                'price_q97_5': float(row['price_q97_5']),  # 95% 上限值
            }
            
            # 只有在實際值不是 NaN 時才添加到 additional_data
            if not pd.isna(row['system_price_real']):
                additional_data['system_price_real'] = float(row['system_price_real'])
            
            try:
                # 嘗試獲取現有記錄
                prediction = CustomAreaPricePredict.objects.filter(
                    model=model,
                    trade_date=trade_date,
                    time_code=time_code,
                    area=area,
                    calculating_date=calculating_date
                ).first()
                
                # 準備資料 - 根據模型定義映射資料
                price_5 = float(row['price_q2_5'])
                price_50 = float(row['price_q50'])
                price_95 = float(row['price_q97_5'])
                
                if prediction:
                    # 檢查是否有更改
                    if (prediction.price_5 != price_5 or 
                        prediction.price_50 != price_50 or 
                        prediction.price_95 != price_95 or 
                        prediction.additional_data != additional_data):
                        
                        # 更新記錄
                        prediction.price_5 = price_5
                        prediction.price_50 = price_50
                        prediction.price_95 = price_95
                        prediction.additional_data = additional_data
                        prediction.save()
                        stats['updated'] += 1
                        if verbose:
                            self.stdout.write(f"更新記錄: {area.name}, {trade_date}, 時段 {time_code}")
                    else:
                        stats['unchanged'] += 1
                else:
                    # 創建新記錄
                    CustomAreaPricePredict.objects.create(
                        model=model,
                        trade_date=trade_date,
                        time_code=time_code,
                        area=area,
                        calculating_date=calculating_date,
                        price_5=price_5,
                        price_50=price_50,
                        price_95=price_95,
                        additional_data=additional_data
                    )
                    stats['new'] += 1
                    if verbose:
                        self.stdout.write(f"新增記錄: {area.name}, {trade_date}, 時段 {time_code}")
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(
                    f"保存記錄時出錯 ({area.name}, {trade_date}, 時段 {time_code}): {str(e)}"
                ))
                stats['errors'] += 1
                
        return stats
