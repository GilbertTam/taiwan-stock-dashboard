#!/bin/bash

source "$(dirname "$0")/common.sh"

# 顯示使用方法
show_usage() {
    echo "Usage: $0 <start_date> <end_date> [--spot-source=<jepx|quick>]"
    echo "Dates should be in YYYYMMDD format"
    echo "Example: $0 20250401 20250407 --spot-source=jepx"
    echo ""
    echo "Options:"
    echo "  --spot-source    Spot market data source (jepx or quick, default: jepx)"
    echo "                   Note: All quick-related commands (including weather data)"
    echo "                   will not be available when running after 2025/09/30"
}

# 初始化變數
SPOT_SOURCE="jepx"

# 解析命令行參數
while [[ $# -gt 0 ]]; do
    case $1 in
        --spot-source=*)
            SPOT_SOURCE="${1#*=}"
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            if [ -z "$START_DATE" ]; then
                START_DATE=$1
            elif [ -z "$END_DATE" ]; then
                END_DATE=$1
            else
                print_message "$RED" "Unknown parameter: $1"
                show_usage
                exit 1
            fi
            shift
            ;;
    esac
done

# 檢查必要參數
if [ -z "$START_DATE" ] || [ -z "$END_DATE" ]; then
    print_message "$RED" "Error: Please provide both start and end dates"
    show_usage
    exit 1
fi

# 檢查spot source參數
if [ "$SPOT_SOURCE" != "jepx" ] && [ "$SPOT_SOURCE" != "quick" ]; then
    print_message "$RED" "Error: Invalid spot source. Must be either 'jepx' or 'quick'"
    show_usage
    exit 1
fi

# 檢查當前日期是否超過期限
EXPIRY_DATE=20250930
CURRENT_DATE=$(date +%Y%m%d)
if [ "$CURRENT_DATE" -gt "$EXPIRY_DATE" ]; then
    print_message "$RED" "Error: All quick-related commands are no longer available after 2025/09/30"
    print_message "$RED" "Current date: ${CURRENT_DATE}"
    exit 1
fi

# 從START_DATE中提取年份
YEAR="${START_DATE:0:4}"

print_message "$BLUE" "Updating data from ${START_DATE} to ${END_DATE} using ${SPOT_SOURCE} spot source..."

# 構建命令陣列
commands=()

# Spot市場資料命令
if [ "$SPOT_SOURCE" = "jepx" ]; then
    commands+=(
        "python manage.py download_spot_jepx ${YEAR}"
    )
else
    commands+=(
        "python manage.py download_spot_quick ${START_DATE} ${END_DATE}"
    )
fi

# 添加共同命令
commands+=(
    # dprice 只有含當天七天的資料
    "python manage.py download_dprice_spot_predict"
    "python manage.py download_quick_spot_predict ${START_DATE} ${END_DATE}"
    "python manage.py download_quick_weather_actual ${START_DATE} ${END_DATE}"
    "python manage.py download_quick_weather_forecast ${START_DATE} ${END_DATE}"
)

# 執行命令
for cmd in "${commands[@]}"; do
    print_message "$GREEN" "Executing: $cmd"
    docker exec -it ${CONTAINER_WEB_NAME} bash -c "$cmd"
    
    # 檢查命令執行結果
    if [ $? -eq 0 ]; then
        print_message "$GREEN" "Command completed successfully"
    else
        print_message "$RED" "Command failed: $cmd"
        exit 1
    fi
done

print_message "$BLUE" "All data update commands completed"
