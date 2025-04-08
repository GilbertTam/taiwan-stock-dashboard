#!/bin/bash

source "$(dirname "$0")/common.sh"

# 顯示使用方法
show_usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  --model_name=<name>         Name of the prediction model (default: TestModel)"
    echo "  --model_version=<version>   Version of the prediction model (default: 1.0.0)"
    echo "  --start_date=<YYYY-MM-DD>   Start date (default: 7 days ago)"
    echo "  --end_date=<YYYY-MM-DD>     End date (default: today)"
    echo "  --days_ahead=<number>       Days ahead for prediction (default: 1)"
    echo "  --calculating_dates=<number> Number of calculating dates per trade date (default: 3)"
    echo "  --error_range=<number>      Prediction error range (default: 0.15)"
    echo "  --clear                     Clear existing predictions for the model"
    echo ""
    echo "Example:"
    echo "  bash dev-tool.sh generate-test-data --model_name=\"MyTestModel\" --start_date=\"2025-04-01\" --end_date=\"2025-04-07\""
}

# 初始化變數（空值表示使用默認值）
MODEL_NAME=""
MODEL_VERSION=""
START_DATE=""
END_DATE=""
DAYS_AHEAD=""
CALCULATING_DATES=""
ERROR_RANGE=""
CLEAR=""

# 解析命令行參數
for i in "$@"; do
    case $i in
        --model_name=*)
            MODEL_NAME="${i#*=}"
            shift
            ;;
        --model_version=*)
            MODEL_VERSION="${i#*=}"
            shift
            ;;
        --start_date=*)
            START_DATE="${i#*=}"
            shift
            ;;
        --end_date=*)
            END_DATE="${i#*=}"
            shift
            ;;
        --days_ahead=*)
            DAYS_AHEAD="${i#*=}"
            shift
            ;;
        --calculating_dates=*)
            CALCULATING_DATES="${i#*=}"
            shift
            ;;
        --error_range=*)
            ERROR_RANGE="${i#*=}"
            shift
            ;;
        --clear)
            CLEAR="true"
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            print_message "$RED" "Unknown option: $i"
            show_usage
            exit 1
            ;;
    esac
done

# 構建命令字符串
CMD="python manage.py generate_test_predictions"

# 添加可選參數
[ -n "$MODEL_NAME" ] && CMD="$CMD --model_name=\"$MODEL_NAME\""
[ -n "$MODEL_VERSION" ] && CMD="$CMD --model_version=\"$MODEL_VERSION\""
[ -n "$START_DATE" ] && CMD="$CMD --start_date=\"$START_DATE\""
[ -n "$END_DATE" ] && CMD="$CMD --end_date=\"$END_DATE\""
[ -n "$DAYS_AHEAD" ] && CMD="$CMD --days_ahead=$DAYS_AHEAD"
[ -n "$CALCULATING_DATES" ] && CMD="$CMD --calculating_dates=$CALCULATING_DATES"
[ -n "$ERROR_RANGE" ] && CMD="$CMD --error_range=$ERROR_RANGE"
[ -n "$CLEAR" ] && CMD="$CMD --clear"

# 顯示將要執行的命令
print_message "$BLUE" "Executing command in ${CONTAINER_WEB_NAME}..."
print_message "$GREEN" "Command: $CMD"

# 執行命令
docker exec -it ${CONTAINER_WEB_NAME} bash -c "$CMD"

# 檢查執行結果
if [ $? -eq 0 ]; then
    print_message "$GREEN" "Test data generation completed successfully"
else
    print_message "$RED" "Test data generation failed"
    exit 1
fi
