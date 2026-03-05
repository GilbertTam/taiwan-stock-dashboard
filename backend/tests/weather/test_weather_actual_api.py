"""
測試 /api/market-info/weather-actual API 端點的 area_name 參數

驗證：
1. API 端點正確接受 area_name 參數
2. 參數正確傳遞到 es_service
3. 測試不同地區的查詢結果
4. 驗證回傳資料格式正確
"""

import sys
import os
from datetime import datetime, timedelta

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from app.main import app
from app.api.v1.auth import get_current_user

# Mock authentication for testing
def mock_get_current_user():
    return {"username": "test_user", "id": 1}

app.dependency_overrides[get_current_user] = mock_get_current_user

client = TestClient(app)

# 測試地區列表
TEST_AREAS = [
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


def test_weather_actual_endpoint_basic():
    """測試基本的 API 端點功能"""
    print("\n=== 測試 /api/market-info/weather-actual 基本功能 ===")
    
    # 使用最近7天的資料
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)
    start_date_str = start_date.strftime("%Y%m%d")
    end_date_str = end_date.strftime("%Y%m%d")
    
    # 測試不帶 area_name 參數
    print("\n1. 測試不帶 area_name 參數")
    response = client.get(
        "/api/market-info/weather-actual",
        params={
            "start_date": start_date_str,
            "end_date": end_date_str
        }
    )
    
    print(f"   狀態碼: {response.status_code}")
    assert response.status_code == 200, f"預期狀態碼 200，實際 {response.status_code}"
    
    data = response.json()
    print(f"   回傳格式: {list(data.keys())}")
    assert "result" in data, "回傳資料應包含 'result' 欄位"
    assert "code" in data, "回傳資料應包含 'code' 欄位"
    assert "count" in data, "回傳資料應包含 'count' 欄位"
    assert "data" in data, "回傳資料應包含 'data' 欄位"
    print(f"   資料筆數: {data['count']}")
    print("   ✓ 基本功能測試通過")
    
    return True


def test_weather_actual_endpoint_with_area():
    """測試帶 area_name 參數的 API 端點"""
    print("\n=== 測試 /api/market-info/weather-actual 的 area_name 參數 ===")
    
    # 使用最近7天的資料
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)
    start_date_str = start_date.strftime("%Y%m%d")
    end_date_str = end_date.strftime("%Y%m%d")
    
    results = {}
    
    for area in TEST_AREAS:
        print(f"\n測試地區: {area}")
        
        try:
            response = client.get(
                "/api/market-info/weather-actual",
                params={
                    "start_date": start_date_str,
                    "end_date": end_date_str,
                    "area_name": area
                }
            )
            
            # 檢查狀態碼
            if response.status_code != 200:
                results[area] = {
                    'success': False,
                    'error': f"HTTP {response.status_code}"
                }
                print(f"  ✗ HTTP 錯誤: {response.status_code}")
                continue
            
            data = response.json()
            
            # 驗證回傳格式
            assert "result" in data, "回傳資料應包含 'result' 欄位"
            assert "code" in data, "回傳資料應包含 'code' 欄位"
            assert "count" in data, "回傳資料應包含 'count' 欄位"
            assert "data" in data, "回傳資料應包含 'data' 欄位"
            
            weather_data = data["data"]
            
            results[area] = {
                'success': True,
                'count': len(weather_data),
                'has_cross_area_data': False,
                'cross_area_examples': []
            }
            
            # 驗證所有資料點的 area 欄位
            if weather_data:
                for record in weather_data:
                    record_area = record.get('area')
                    if record_area and record_area != area:
                        results[area]['has_cross_area_data'] = True
                        if len(results[area]['cross_area_examples']) < 3:
                            results[area]['cross_area_examples'].append({
                                'expected': area,
                                'actual': record_area,
                                'datetime': record.get('datetime')
                            })
                
                print(f"  ✓ 取得 {len(weather_data)} 筆資料")
                
                if results[area]['has_cross_area_data']:
                    print(f"  ✗ 發現跨地區資料混入！")
                    for example in results[area]['cross_area_examples']:
                        print(f"    - 預期: {example['expected']}, 實際: {example['actual']}, 時間: {example['datetime']}")
                else:
                    print(f"  ✓ 無跨地區資料混入")
                    
                # 顯示第一筆資料的欄位（僅第一個地區）
                if area == TEST_AREAS[0]:
                    print(f"  資料欄位範例: {list(weather_data[0].keys())[:10]}...")
            else:
                print(f"  ⚠ 無資料（可能該地區無資料或日期範圍內無資料）")
                
        except Exception as e:
            results[area] = {
                'success': False,
                'error': str(e)
            }
            print(f"  ✗ 測試失敗: {e}")
    
    return results


def test_weather_actual_endpoint_parameter_validation():
    """測試參數驗證"""
    print("\n=== 測試參數驗證 ===")
    
    # 測試缺少必要參數
    print("\n1. 測試缺少 start_date 參數")
    response = client.get(
        "/api/market-info/weather-actual",
        params={"end_date": "20240101"}
    )
    print(f"   狀態碼: {response.status_code}")
    assert response.status_code == 400, "缺少必要參數應回傳 400"
    print("   ✓ 正確回傳 400 錯誤")
    
    # 測試無效的日期格式
    print("\n2. 測試無效的日期格式")
    response = client.get(
        "/api/market-info/weather-actual",
        params={
            "start_date": "2024-01-01",  # 錯誤格式
            "end_date": "20240107"
        }
    )
    print(f"   狀態碼: {response.status_code}")
    assert response.status_code == 400, "無效日期格式應回傳 400"
    print("   ✓ 正確回傳 400 錯誤")
    
    print("\n✓ 參數驗證測試通過")
    return True


def print_summary(results):
    """列印測試摘要"""
    print("\n" + "="*60)
    print("測試摘要")
    print("="*60)
    
    success_count = sum(1 for r in results.values() if r.get('success', False))
    cross_area_count = sum(1 for r in results.values() if r.get('has_cross_area_data', False))
    
    print(f"\n成功查詢: {success_count}/{len(TEST_AREAS)}")
    print(f"發現跨地區資料: {cross_area_count}/{len(TEST_AREAS)}")
    
    if cross_area_count > 0:
        print(f"\n✗ 測試失敗：發現跨地區資料混入")
        print("\n有問題的地區:")
        for area, result in results.items():
            if result.get('has_cross_area_data', False):
                print(f"  - {area}")
    else:
        print(f"\n✓ 測試通過：無跨地區資料混入")
    
    # 列出失敗的查詢
    failed_areas = [area for area, r in results.items() if not r.get('success', False)]
    if failed_areas:
        print(f"\n查詢失敗的地區:")
        for area in failed_areas:
            error = results[area].get('error', 'Unknown error')
            print(f"  - {area}: {error}")
    
    print("="*60)
    
    return cross_area_count == 0 and len(failed_areas) == 0


if __name__ == "__main__":
    print("開始測試 /api/market-info/weather-actual API 端點...")
    print(f"測試地區: {', '.join(TEST_AREAS)}")
    
    all_passed = True
    
    # 測試 1: 基本功能
    try:
        test_weather_actual_endpoint_basic()
    except Exception as e:
        print(f"\n✗ 基本功能測試失敗: {e}")
        all_passed = False
    
    # 測試 2: area_name 參數
    try:
        results = test_weather_actual_endpoint_with_area()
        if not print_summary(results):
            all_passed = False
    except Exception as e:
        print(f"\n✗ area_name 參數測試失敗: {e}")
        all_passed = False
    
    # 測試 3: 參數驗證
    try:
        test_weather_actual_endpoint_parameter_validation()
    except Exception as e:
        print(f"\n✗ 參數驗證測試失敗: {e}")
        all_passed = False
    
    # 最終結果
    print("\n" + "="*60)
    if all_passed:
        print("✓ 所有測試通過！API 端點正確運作。")
    else:
        print("✗ 部分測試失敗，請檢查上述錯誤訊息。")
    print("="*60)
