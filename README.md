# Quick API Backend

This is Quick API Backend.

## Requirements

Please specify the required variables in `.env` for this project.

## Usage

### Quick Start

```bash
docker-compose build && docker-compose up
```

### Fetch Data

You need to enter the shell at the first time to fetch data.

```bash
bash dev-tool.sh shell
```

Then you can run the following commands to fetch data.

#### Spot Market

Spot market data is fetched from the API.

```bash
# Basic usage
python manage.py download_spot 20240101 20240131
# Use --days-interval to set the interval between two dates
python manage.py download_spot 20240101 20240131 --days-interval 15 --page-size 5000
```

#### Spot Market Predict

Spot market prediction data is fetched from the API.

```bash
# Basic usage
python manage.py download_spot_predict 20250101 20250131
# Use --days-interval to set the interval between two dates
python manage.py download_spot_predict 20250101 20250131 --days-interval 15 --page-size 5000
```

#### Weather Data

Weather data is fetched from the API.

```bash
# 基本用法
python manage.py download_weather_actual 20250101 20250101
# 指定每頁資料筆數
python manage.py download_weather_actual 20250101 20250101 --page-size 1000
```

#### Weather Data Predict

Weather data prediction is fetched from the API.

```bash
# 基本用法
python manage.py download_weather_forecast 20250101 20250131
# 指定每頁資料筆數
python manage.py download_weather_forecast 20250101 20250131 --page-size 1000
```

#### Generate Test Prediction Data

Generate test prediction data based on existing spot market data.

```bash
# Basic usage - generates test data for the last 7 days
python manage.py generate_test_predictions

# Specify model name and version
python manage.py generate_test_predictions --model_name="MyTestModel" --model_version="2.0.0"

# Specify custom date range
python manage.py generate_test_predictions --start_date="2023-01-01" --end_date="2023-01-07"

# Specify prediction parameters
python manage.py generate_test_predictions --days_ahead=2 --calculating_dates=5 --error_range=0.2

# Clear existing predictions before generating new ones
python manage.py generate_test_predictions --clear

# Full example with all parameters
python manage.py generate_test_predictions --model_name="MyTestModel" --model_version="2.0.0" \
  --start_date="2023-01-01" --end_date="2023-01-07" --days_ahead=2 \
  --calculating_dates=5 --error_range=0.2 --clear
```

| Parameter | Description | Default |
|-----------|-------------|---------|
| `--model_name` | Name of the prediction model | `TestModel` |
| `--model_version` | Version of the prediction model | `1.0.0` |
| `--start_date` | Start date (YYYY-MM-DD) | Today - 7 days |
| `--end_date` | End date (YYYY-MM-DD) | Today |
| `--days_ahead` | Days ahead for prediction (e.g., 1 for D+1) | `1` |
| `--calculating_dates` | Number of calculating dates per trade date | `3` |
| `--error_range` | Prediction error range (e.g., 0.15 for 15%) | `0.15` |
| `--clear` | Clear existing predictions for the model | `False` |


### Rebuild

Clean up and rebuild.

```bash
rm -rf backend-db-data &&  docker-compose down -v && docker-compose build && docker-compose up
```

## Misc

- Create superuser

```bash
bash dev-tool.sh create-superuser
```

- Enter Shell

```bash
bash dev-tool.sh shell
```

- Start New APP

```bash
bash dev-tool.sh django-startapp <YOUR_NEW_APP_NAME>
```

## Link

> Here's port `8787` is an example. You can define it in `.env` file.

- Admin: http://localhost:8787/api/__hidden_admin/

- Redoc: http://localhost:8787/api/__hidden_redoc

- Swagger: http://localhost:8787/api/__hidden_swagger