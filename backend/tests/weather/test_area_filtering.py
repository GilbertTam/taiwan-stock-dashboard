"""
測試所有地區的天氣資料查詢正確性

驗證：
1. 對所有可用地區執行查詢
2. 驗證每個查詢回傳的資料都屬於正確的地區
3. 確認無跨地區資料混入
4. 測試三個天氣端點：actual, actual-daily, forecast
"""

import sys
import os
from datetime import datetime, timedelta

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.es_service import ESService


# 所有可用地區（根據 mockData.ts）
AVAILABLE_AREAS = [
    'hokkaido',  # 北海道
    'tohoku',    # 東北
    'tokyo',     # 東京
    'chubu',     # 中部
    'hokuriku',  # 北陸
    'kansai',    # 關西
    'chugoku',   # 中國
    'shikoku',   # 四國
    'kyushu',    # 九州
]


def test_weather_actual_area_filtering():
    """測試 get_weather_actual 的地區篩選"""
    print("\n=== 測試 get_weather_actual 地區篩選 ===")
    
    es_service = ESService()
    
    # 使用最近7天的資料進行測試
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)
    start_date_str = start_date.strftime("%Y%m%d")
    end_date_str = end_date.strftime("%Y%m%d")
    
    results = {}
    
    for area in AVAILABLE_AREAS:
        print(f"\n測試地區: {area}")
        try:
            data = es_service.get_weather_actual(
                start_date=start_date_str,
                end_date=end_date_str,
                area_name=area
            )
            
            results[area] = {
                'success': True,
                'count': len(data),
                'has_cross_area_data': False,
                'cross_area_examples': []
            }
            
            # 驗證所有資料點的 area 欄位
            if data:
                for record in data:
                    record_area = record.get('area')
                    if record_area and record_area != area:
                        results[area]['has_cross_area_data'] = True
                        if len(results[area]['cross_area_examples']) < 3:
                            results[area]['cross_area_examples'].append({
                                'expected': area,
                                'actual': record_area,
                                'datetime': record.get('datetime')
                            })
                
                print(f"  ✓ 取得 {len(data)} 筆資料")
                if results[area]['has_cross_area_data']:
                    print(f"  ✗ 發現跨地區資料混入！")
                    for example in results[area]['cross_area_examples']:
                        print(f"    - 預期: {example['expected']}, 實際: {example['actual']}, 時間: {example['datetime']}")
                else:
                    print(f"  ✓ 無跨地區資料混入")
            else:
                print(f"  ⚠ 無資料（可能該地區無資料或日期範圍內無資料）")
                
        except Exception as e:
            results[area] = {
                'success': False,
                'error': str(e)
            }
            print(f"  ✗ 查詢失敗: {e}")
    
    return results


def test_weather_actual_daily_area_filtering():
    """測試 get_weather_actual_daily 的地區篩選"""
    print("\n=== 測試 get_weather_actual_daily 地區篩選 ===")
    
    es_service = ESService()
    
    # 使用最近7天的資料進行測試
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)
    start_date_str = start_date.strftime("%Y%m%d")
    end_date_str = end_date.strftime("%Y%m%d")
    
    results = {}
    
    for area in AVAILABLE_AREAS:
        print(f"\n測試地區: {area}")
        try:
            data = es_service.get_weather_actual_daily(
                start_date=start_date_str,
                end_date=end_date_str,
                area_name=area
            )
            
            results[area] = {
                'success': True,
                'count': len(data),
                'has_cross_area_data': False,
                'cross_area_examples': []
            }
            
            # 驗證所有資料點的 area 欄位
            if data:
                for record in data:
                    record_area = record.get('area')
                    if record_area and record_area != area:
                        results[area]['has_cross_area_data'] = True
                        if len(results[area]['cross_area_examples']) < 3:
                            results[area]['cross_area_examples'].append({
                                'expected': area,
                                'actual': record_area,
                                'datetime': record.get('datetime')
                            })
                
                print(f"  ✓ 取得 {len(data)} 筆資料")
                if results[area]['has_cross_area_data']:
                    print(f"  ✗ 發現跨地區資料混入！")
                    for example in results[area]['cross_area_examples']:
                        print(f"    - 預期: {example['expected']}, 實際: {example['actual']}, 時間: {example['datetime']}")
                else:
                    print(f"  ✓ 無跨地區資料混入")
            else:
                print(f"  ⚠ 無資料（可能該地區無資料或日期範圍內無資料）")
                
        except Exception as e:
            results[area] = {
                'success': False,
                'error': str(e)
            }
            print(f"  ✗ 查詢失敗: {e}")
    
    return results


def test_weather_forecast_area_filtering():
    """測試 get_weather_forecast 的地區篩選"""
    print("\n=== 測試 get_weather_forecast 地區篩選 ===")
    
    es_service = ESService()
    
    # 使用最近7天的資料進行測試
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)
    start_date_str = start_date.strftime("%Y%m%d")
    end_date_str = end_date.strftime("%Y%m%d")
    
    results = {}
    
    for area in AVAILABLE_AREAS:
        print(f"\n測試地區: {area}")
        try:
            data = es_service.get_weather_forecast(
                start_date=start_date_str,
                end_date=end_date_str,
                area_name=area
            )
            
            results[area] = {
                'success': True,
                'count': len(data),
                'has_cross_area_data': False,
                'cross_area_examples': []
            }
            
            # 驗證所有資料點的 area 欄位
            if data:
                for record in data:
                    record_area = record.get('area')
                    if record_area and record_area != area:
                        results[area]['has_cross_area_data'] = True
                        if len(results[area]['cross_area_examples']) < 3:
                            results[area]['cross_area_examples'].append({
                                'expected': area,
                                'actual': record_area,
                                'datetime': record.get('datetime')
                            })
                
                print(f"  ✓ 取得 {len(data)} 筆資料")
                if results[area]['has_cross_area_data']:
                    print(f"  ✗ 發現跨地區資料混入！")
                    for example in results[area]['cross_area_examples']:
                        print(f"    - 預期: {example['expected']}, 實際: {example['actual']}, 時間: {example['datetime']}")
                else:
                    print(f"  ✓ 無跨地區資料混入")
            else:
                print(f"  ⚠ 無資料（可能該地區無資料或日期範圍內無資料）")
                
        except Exception as e:
            results[area] = {
                'success': False,
                'error': str(e)
            }
            print(f"  ✗ 查詢失敗: {e}")
    
    return results


def print_summary(actual_results, daily_results, forecast_results):
    """列印測試摘要"""
    print("\n" + "="*60)
    print("測試摘要")
    print("="*60)
    
    all_results = {
        'weather_actual': actual_results,
        'weather_actual_daily': daily_results,
        'weather_forecast': forecast_results
    }
    
    for endpoint, results in all_results.items():
        print(f"\n{endpoint}:")
        success_count = sum(1 for r in results.values() if r.get('success', False))
        cross_area_count = sum(1 for r in results.values() if r.get('has_cross_area_data', False))
        
        print(f"  成功查詢: {success_count}/{len(AVAILABLE_AREAS)}")
        print(f"  發現跨地區資料: {cross_area_count}/{len(AVAILABLE_AREAS)}")
        
        if cross_area_count > 0:
            print(f"  ✗ 測試失敗：發現跨地區資料混入")
        else:
            print(f"  ✓ 測試通過：無跨地區資料混入")
    
    # 總體結果
    total_cross_area = sum(
        sum(1 for r in results.values() if r.get('has_cross_area_data', False))
        for results in all_results.values()
    )
    
    print("\n" + "="*60)
    if total_cross_area == 0:
        print("✓ 所有測試通過！地區篩選正確運作。")
    else:
        print(f"✗ 測試失敗！共發現 {total_cross_area} 個地區有跨地區資料混入。")
    print("="*60)


if __name__ == "__main__":
    print("開始測試所有地區的天氣資料查詢...")
    print(f"測試地區: {', '.join(AVAILABLE_AREAS)}")
    
    # 執行三個端點的測試
    actual_results = test_weather_actual_area_filtering()
    daily_results = test_weather_actual_daily_area_filtering()
    forecast_results = test_weather_forecast_area_filtering()
    
    # 列印摘要
    print_summary(actual_results, daily_results, forecast_results)
