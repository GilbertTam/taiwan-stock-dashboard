#!/bin/bash

# 測試 /api/market-info/weather-actual API 端點的 area_name 參數
# 使用 curl 進行 HTTP 請求測試

echo "==================================="
echo "測試 /api/market-info/weather-actual API 端點"
echo "==================================="

# API 基礎 URL（根據實際環境調整）
BASE_URL="${API_BASE_URL:-http://localhost:8000}"
API_ENDPOINT="$BASE_URL/api/market-info/weather-actual"

# 測試日期範圍（最近7天）
END_DATE=$(date +%Y%m%d)
START_DATE=$(date -v-7d +%Y%m%d 2>/dev/null || date -d '7 days ago' +%Y%m%d)

echo ""
echo "測試配置:"
echo "  API URL: $API_ENDPOINT"
echo "  日期範圍: $START_DATE - $END_DATE"
echo ""

# 測試地區列表
AREAS=("hokkaido" "tohoku" "tokyo" "chubu" "hokuriku" "kansai" "chugoku" "shikoku" "kyushu")

# 顏色輸出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 測試計數器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 測試 1: 基本功能（不帶 area_name）
echo "==================================="
echo "測試 1: 基本功能（不帶 area_name）"
echo "==================================="
TOTAL_TESTS=$((TOTAL_TESTS + 1))

RESPONSE=$(curl -s -w "\n%{http_code}" "$API_ENDPOINT?start_date=$START_DATE&end_date=$END_DATE")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓${NC} HTTP 狀態碼: $HTTP_CODE"
    
    # 檢查回傳格式
    if echo "$BODY" | jq -e '.result and .code and .count and .data' > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} 回傳格式正確"
        COUNT=$(echo "$BODY" | jq -r '.count')
        echo "  資料筆數: $COUNT"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗${NC} 回傳格式錯誤"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
else
    echo -e "${RED}✗${NC} HTTP 狀態碼: $HTTP_CODE (預期 200)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""

# 測試 2: 測試每個地區的 area_name 參數
echo "==================================="
echo "測試 2: 測試 area_name 參數"
echo "==================================="

for AREA in "${AREAS[@]}"; do
    echo ""
    echo "測試地區: $AREA"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    RESPONSE=$(curl -s -w "\n%{http_code}" "$API_ENDPOINT?start_date=$START_DATE&end_date=$END_DATE&area_name=$AREA")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "  ${GREEN}✓${NC} HTTP 狀態碼: $HTTP_CODE"
        
        # 檢查回傳格式
        if echo "$BODY" | jq -e '.result and .code and .count and .data' > /dev/null 2>&1; then
            COUNT=$(echo "$BODY" | jq -r '.count')
            echo "  ${GREEN}✓${NC} 回傳格式正確"
            echo "    資料筆數: $COUNT"
            
            # 檢查是否有跨地區資料
            if [ "$COUNT" -gt 0 ]; then
                # 檢查前幾筆資料的 area 欄位
                CROSS_AREA=$(echo "$BODY" | jq -r --arg area "$AREA" '.data[] | select(.area != null and .area != $area) | .area' | head -n 1)
                
                if [ -z "$CROSS_AREA" ]; then
                    echo -e "  ${GREEN}✓${NC} 無跨地區資料混入"
                    PASSED_TESTS=$((PASSED_TESTS + 1))
                else
                    echo -e "  ${RED}✗${NC} 發現跨地區資料: $CROSS_AREA (預期: $AREA)"
                    FAILED_TESTS=$((FAILED_TESTS + 1))
                fi
            else
                echo -e "  ${YELLOW}⚠${NC} 無資料（可能該地區無資料）"
                PASSED_TESTS=$((PASSED_TESTS + 1))
            fi
        else
            echo -e "  ${RED}✗${NC} 回傳格式錯誤"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    else
        echo -e "  ${RED}✗${NC} HTTP 狀態碼: $HTTP_CODE (預期 200)"
        echo "  回應: $BODY"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
done

echo ""

# 測試 3: 參數驗證
echo "==================================="
echo "測試 3: 參數驗證"
echo "==================================="

# 測試缺少必要參數
echo ""
echo "3.1 測試缺少 start_date 參數"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

RESPONSE=$(curl -s -w "\n%{http_code}" "$API_ENDPOINT?end_date=$END_DATE")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "422" ]; then
    echo -e "  ${GREEN}✓${NC} 正確回傳錯誤狀態碼: $HTTP_CODE"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "  ${RED}✗${NC} 狀態碼: $HTTP_CODE (預期 400 或 422)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# 測試無效的日期格式
echo ""
echo "3.2 測試無效的日期格式"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

RESPONSE=$(curl -s -w "\n%{http_code}" "$API_ENDPOINT?start_date=2024-01-01&end_date=$END_DATE")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "422" ]; then
    echo -e "  ${GREEN}✓${NC} 正確回傳錯誤狀態碼: $HTTP_CODE"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "  ${RED}✗${NC} 狀態碼: $HTTP_CODE (預期 400 或 422)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# 測試摘要
echo ""
echo "==================================="
echo "測試摘要"
echo "==================================="
echo "總測試數: $TOTAL_TESTS"
echo -e "通過: ${GREEN}$PASSED_TESTS${NC}"
echo -e "失敗: ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ 所有測試通過！API 端點正確運作。${NC}"
    exit 0
else
    echo -e "${RED}✗ 部分測試失敗，請檢查上述錯誤訊息。${NC}"
    exit 1
fi
