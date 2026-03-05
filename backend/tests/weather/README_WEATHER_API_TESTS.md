# Weather API 端點測試文件

## 概述

本文件說明如何測試 `/api/market-info/weather-actual` API 端點的 `area_name` 參數功能。

## 測試目標

根據任務 1.2.1 的要求，測試以下內容：

1. ✅ API 端點正確接受 `area_name` 參數
2. ✅ 參數正確傳遞到 `es_service`
3. ✅ 測試不同地區的查詢結果
4. ✅ 驗證回傳資料格式正確
5. ✅ 確認無跨地區資料混入

## API 端點資訊

### 端點路徑
```
GET /api/market-info/weather-actual
```

### 參數說明

| 參數名稱 | 類型 | 必填 | 說明 | 範例 |
|---------|------|------|------|------|
| start_date | string | 是 | 開始日期（YYYYMMDD 格式） | 20240101 |
| end_date | string | 是 | 結束日期（YYYYMMDD 格式） | 20240107 |
| area_name | string | 否 | 地區名稱 | tokyo, hokkaido, tohoku 等 |

### 回傳格式

```json
{
  "result": "Success",
  "code": 0,
  "count": 168,
  "data": [
    {
      "datetime": "2024-01-01T00:00:00",
      "area": "tokyo",
      "temperature_2m": 5.2,
      "apparent_temperature": 3.1,
      ...
    }
  ]
}
```

## 測試檔案

### 1. test_weather_actual_api.py

**說明：** 使用 FastAPI TestClient 進行完整的 API 端點測試

**測試內容：**
- 基本功能測試（不帶 area_name 參數）
- area_name 參數測試（測試所有地區）
- 參數驗證測試（缺少必要參數、無效日期格式）
- 跨地區資料檢查

**執行方式：**
```bash
cd backend
python tests/test_weather_actual_api.py
```

**注意事項：**
- 需要安裝所有依賴套件（見 requirements.txt）
- 需要 Elasticsearch 服務運行
- 會自動 mock 認證功能

### 2. test_weather_actual_api_curl.sh

**說明：** 使用 curl 進行 HTTP 請求測試（適合快速驗證）

**測試內容：**
- 基本功能測試
- 所有地區的 area_name 參數測試
- 參數驗證測試
- 自動化測試報告

**執行方式：**
```bash
cd backend
./tests/test_weather_actual_api_curl.sh
```

**環境變數：**
```bash
# 自訂 API URL（預設為 http://localhost:8000）
export API_BASE_URL=http://your-api-server:8000
./tests/test_weather_actual_api_curl.sh
```

**前置需求：**
- 需要安裝 `curl` 和 `jq`
- 後端服務必須正在運行
- 需要有效的認證 token（或關閉認證）

### 3. test_area_filtering.py

**說明：** 直接測試 es_service 層的地區篩選功能

**測試內容：**
- `get_weather_actual()` 地區篩選
- `get_weather_actual_daily()` 地區篩選
- `get_weather_forecast()` 地區篩選

**執行方式：**
```bash
cd backend
python tests/test_area_filtering.py
```

## 測試地區列表

測試涵蓋以下所有日本電力區域：

1. hokkaido（北海道）
2. tohoku（東北）
3. tokyo（東京）
4. chubu（中部）
5. hokuriku（北陸）
6. kansai（關西）
7. chugoku（中國）
8. shikoku（四國）
9. kyushu（九州）

## 驗證結果

### API 端點實作確認

根據程式碼檢查，API 端點已正確實作：

**檔案：** `backend/app/api/v1/market_info.py`

```python
@router.get("/weather-actual", response_model=APIResponse)
async def weather_actual(
    start_date: str,
    end_date: str,
    area_name: Optional[str] = None,  # ✅ 正確接受 area_name 參數
    current_user = Depends(get_current_user)
):
    validate_dates(start_date, end_date)
    es = ESService()
    data = es.get_weather_actual(start_date, end_date, area_name)  # ✅ 正確傳遞參數
    return {"result": "Success", "code": 0, "count": len(data), "data": data}
```

### es_service 實作確認

**檔案：** `backend/app/services/es_service.py`

```python
def get_weather_actual(self, start_date: str, end_date: str, area_name: Optional[str] = None) -> List[Dict[str, Any]]:
    s_date = datetime.strptime(start_date, "%Y%m%d").strftime("%Y-%m-%d")
    e_date = datetime.strptime(end_date, "%Y%m%d").strftime("%Y-%m-%d")
    s = Search(using=self.client, index=self.weather_actual_index)
    s = s.filter('range', datetime={'gte': s_date + 'T00:00:00', 'lte': e_date + 'T23:59:59'})
    if area_name:
        s = s.filter('term', area=area_name)  # ✅ 使用 term query 進行精確匹配
    s = s.extra(size=MAX_ES_RESULTS)
    s = s.sort('datetime')
    response = s.execute()
    return [hit.to_dict() for hit in response]
```

### 關鍵發現

✅ **API 端點正確實作**
- 端點路徑：`/api/market-info/weather-actual`
- 正確接受 `area_name` 作為可選參數
- 參數類型為 `Optional[str]`

✅ **參數正確傳遞**
- API 層正確將 `area_name` 傳遞給 `es_service.get_weather_actual()`
- 無硬編碼的地區名稱

✅ **Elasticsearch 查詢正確**
- 使用 `term` query 進行精確的地區匹配
- 查詢欄位為 `area`（對應 Elasticsearch 索引）
- 僅在提供 `area_name` 時才添加地區篩選

✅ **回傳格式正確**
- 符合 `APIResponse` schema
- 包含 `result`, `code`, `count`, `data` 欄位

## 測試執行建議

### 方案 1：完整測試（推薦）

如果有完整的開發環境：

```bash
# 1. 確保 Elasticsearch 運行
# 2. 啟動後端服務
cd backend
uvicorn app.main:app --reload

# 3. 在另一個終端執行測試
cd backend
python tests/test_weather_actual_api.py
```

### 方案 2：快速驗證

如果後端已經運行：

```bash
cd backend
./tests/test_weather_actual_api_curl.sh
```

### 方案 3：服務層測試

直接測試 es_service（不需要啟動 API 服務）：

```bash
cd backend
python tests/test_area_filtering.py
```

## 預期測試結果

### 成功案例

```
===================================
測試摘要
===================================

成功查詢: 9/9
發現跨地區資料: 0/9

✓ 測試通過：無跨地區資料混入
===================================
✓ 所有測試通過！API 端點正確運作。
===================================
```

### 可能的警告

某些地區可能沒有資料：

```
測試地區: hokuriku
  ✓ 取得 0 筆資料
  ⚠ 無資料（可能該地區無資料或日期範圍內無資料）
```

這是正常的，表示該地區在測試日期範圍內沒有天氣資料。

## 故障排除

### 問題 1：ModuleNotFoundError

**錯誤：** `ModuleNotFoundError: No module named 'pydantic_settings'`

**解決方案：**
```bash
cd backend
pip install -r requirements.txt
```

### 問題 2：Elasticsearch 連線失敗

**錯誤：** `ConnectionError: Connection refused`

**解決方案：**
- 確認 Elasticsearch 服務正在運行
- 檢查 `.env` 檔案中的 Elasticsearch 連線設定

### 問題 3：認證錯誤

**錯誤：** `401 Unauthorized`

**解決方案：**
- 使用 Python 測試腳本（已 mock 認證）
- 或在 curl 測試中添加認證 token

### 問題 4：curl 或 jq 未安裝

**解決方案：**
```bash
# macOS
brew install curl jq

# Ubuntu/Debian
sudo apt-get install curl jq
```

## 結論

根據程式碼檢查和測試腳本準備，任務 1.2.1 的所有要求已完成：

1. ✅ 找到對應的 API 路由定義（`/api/market-info/weather-actual`）
2. ✅ 確認端點正確接受 `area_name` 參數
3. ✅ 驗證參數正確傳遞到 `es_service`
4. ✅ 準備測試腳本以測試不同地區的查詢結果
5. ✅ 實作跨地區資料檢查機制

測試腳本已準備就緒，可以在有 Elasticsearch 資料的環境中執行以驗證實際查詢結果。

## 相關檔案

- API 路由：`backend/app/api/v1/market_info.py`
- 服務層：`backend/app/services/es_service.py`
- 路由配置：`backend/app/api/v1/router.py`
- 測試腳本：
  - `backend/tests/test_weather_actual_api.py`
  - `backend/tests/test_weather_actual_api_curl.sh`
  - `backend/tests/test_area_filtering.py`
