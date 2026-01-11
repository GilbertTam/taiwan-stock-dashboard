# JP Spot Market Electricity Price Dashboard

![](./docs/dashboard.png)

This is a dashboard for visualizing predicted and raw electricity price in Japan Spot market.

## Requirements

Please specify the required variables in `.env` for this project.

## Usage

### Quick Start

```bash
docker-compose build && docker-compose up
```

### Fetch Data

You need to enter the shell at the first time to fetch data.

#### Update Data

You can update data with the following command.

```bash
# Update all data from 2024-01-01 to 2024-01-07 and use QUICK source
bash dev-tool.sh update 20250401 20250407 --spot-source=quick
```

> You can specify the data source using `--spot-source=quick` or `--spot-source=jepx`. Note that the `--spot-source=quick` option will no longer be available after 2025-09-30.

#### Generate Test Prediction Data

Generate test prediction data based on existing spot market data.

Show the help with the following command.

```bash
bash dev-tool.sh generate-test.data --help
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

## Data Import

The project includes a powerful data importer for converting CSV data to the dashboard's prediction format with using API.

### Quick Import

```bash
# Import data with default configuration
cd data-importer
python data_importer.py sample_data/sample_data.csv

# Import with custom configuration
python data_importer.py sample_data/sample_data.csv --config config_examples/config_spot_market.json

# Test import without uploading to API
python data_importer.py sample_data/sample_data.csv --no-upload
```

### Configuration Examples

The `data-importer/config_examples/` folder contains ready-to-use configuration files:
- `config_custom.json` - Basic custom data import
- `config_spot_market.json` - Spot market data with confidence intervals

For detailed usage instructions, see [data-importer/README.md](data-importer/README.md).

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

## Elasticsearch Indexes

The project uses Elasticsearch to store various types of data. 

### Elasticsearch Version

- **Elasticsearch Server**: Version 8.8.0 or higher
- **Python Client Libraries**:
  - `elasticsearch>=8.8.0`
  - `elasticsearch-dsl>=8.8.0`

Below are the index names and their data formats:

### Index Names

| Index Name | Description |
|------------|-------------|
| `prediction` | Custom spot market predictions |
| `jepx_spot_nightly` | JEPX spot market nightly data |
| `imbalance` | Imbalance price data |
| `hjks` | Power plant outage information (発電設備メンテナンス情報) |
| `interconnection` | Interconnection line flow data |
| `jepx_intraday` | JEPX intraday market data |
| `jma_earthquake_actual` | JMA earthquake actual data |
| `occto_area` | OCCTO area supply and demand data |
| `occto_inter` | OCCTO interconnection data |
| `occto_event` | OCCTO event data |
| `tdgc` | TDGC (Tokyo Electric Power Company Holdings) data |
| `weather_actual` | Actual weather data |
| `weather_forecast` | Weather forecast data |

### Data Formats

#### imbalance
```json
{
  "datetime": "2022-04-28 23:30:00",
  "hokkaido": 27.42,
  "tohoku": 27.42,
  "tokyo": 27.42,
  "chubu": 19.89,
  "hokuriku": 19.89,
  "kansai": 19.89,
  "chugoku": 19.89,
  "shikoku": 19.89,
  "kyushu": 19.89,
  "url": "https://www.imbalanceprices-cs.jp/public/price/2022/04/202204_imbalance-price_10.csv",
  "dir": "Imbalance_deficit_rate",
  "md5_id": "6181f1a700256d4480fe5790e4af2550"
}
```

#### hjks
```json
{
  "id": 64627,
  "area": "中部",
  "company": "株式会社JERA",
  "plantcd": "45138",
  "name": "新名古屋火力発電所",
  "format": "火力（ガス）",
  "unitcd": "4513875",
  "unit_name": "新名古屋７－５号",
  "max_capacity": 243000,
  "stop_category": "停止・定期検査等",
  "stop_type": "計画停止",
  "start_datetime": "2025-08-16 00:00:00",
  "outlook": "will be",
  "end_datetime": "2025-08-16 23:59:59",
  "factor": "ボイラ関連設備",
  "upddt": "2025-04-01 14:35:00",
  "down_capacity": null,
  "url": "https://hjks.jepx.or.jp/hjks/outages_ajax",
  "md5_id": "7b2fb7bbd5771fbdff08a677325e3998"
}
```

#### interconnection
```json
{
  "datetime": "2023-04-18 09:00:00",
  "interconnection_name": "越前嶺南線",
  "forward_operating_capacity": 1770,
  "reverse_operating_capacity": 1300,
  "forward_margin": 0,
  "reverse_margin": 0,
  "forward_planned_flow": -273.6,
  "reverse_planned_flow": 273.6,
  "forward_available_capacity": 2043.6,
  "reverse_available_capacity": 1026.4,
  "moving_supply_capacity": -239.617,
  "forward_available_capacity_after_movement": 2283.217,
  "reverse_available_capacity_after_movement": 786.783,
  "forward_disconnection_information": "分断なし",
  "reverse_disconnection_information": "分断なし",
  "crawl_time": "2025-05-05 00:31:20",
  "md5_id": "02aa0e7c04ce836d89f181fe655821c9"
}
```

#### jepx_intraday (intraday)
```json
{
  "date": "2016/04/01",
  "time_code": 8,
  "opening_price": 7.21,
  "high_price": 7.21,
  "low_price": 7.21,
  "closing_price": 7.21,
  "average_price": 7.21,
  "total_contracted_volume": 400,
  "contract_count": 1,
  "datetime": "2016-04-01 03:30:00",
  "cat": "jepx_intraday",
  "dir": "intraday",
  "url": "https://www.jepx.jp/js/csv_read.php?dir=intraday&file=intraday_2016.csv",
  "md5_id": "fc5f872e638553516c1b277f7237a39e"
}
```

#### jma_earthquake_actual
```json
{
  "get_datetime": "2025-12-30T06:19:20.257087",
  "event_datetime": "2025-12-01T00:48:01+00:00",
  "event_id": null,
  "event_date": "2025-12-01",
  "latitude": 42.1117,
  "longitude": 142.552,
  "location": {
    "lat": 42.1117,
    "lon": 142.552
  },
  "magnitude": 4.5,
  "max_intensity": 3,
  "depth": "46 km",
  "location_name": "浦河沖",
  "closest_region": "hokkaido",
  "closest_distance_km": 144.77007999206103,
  "source": "jma_earthquake_actual_import",
  "ingested_at": "2025-12-30T06:19:20.257087",
  "distance_hokkaido_km": 144.77007999206103,
  "distance_tohoku_km": 450.61571381709695,
  "distance_tokyo_km": 755.6622928781524,
  "distance_chubu_km": 912.8333515161924,
  "distance_hokuriku_km": 798.3172759150739,
  "distance_kansai_km": 1028.093608002091,
  "distance_chugoku_km": 1229.3701146530111,
  "distance_shikoku_km": 1138.5726332804843,
  "distance_kyushu_km": 1424.345403956466
}
```

#### occto_area
```json
{
  "area_demand": 15444,
  "nuclear_power": 0,
  "hydropower": 1142,
  "geothermal_power": 2,
  "biomass": 204,
  "solar_power_generation_actual": 0,
  "solar_power_output_control": 0,
  "wind_power_generation_actual": 42,
  "wind_power_output_control": 0,
  "pumped_storage": 4,
  "battery_storage": 0,
  "interconnection_line": 188,
  "others": 34,
  "total": 15444,
  "thermal": 13828,
  "datetime": "2024-03-07 22:30:00",
  "area": "中部",
  "url": "https://powergrid.chuden.co.jp/denki_yoho_content_data/eria_jukyu_2023.zip",
  "md5_id": "a51c1ec49d8aaba9b20e0652e41a573d"
}
```

#### occto_inter
```json
{
  "interconnection_name": "関門連系線",
  "target_date": "2021-03-18",
  "target_time": "22:15",
  "forward_operating_capacity": 400,
  "reverse_operating_capacity": -2310,
  "forward_wide_area_adjustment_capacity": 0,
  "reverse_wide_area_adjustment_capacity": 0,
  "forward_margin": 0,
  "reverse_margin": 0,
  "forward_available_capacity": 2710,
  "reverse_available_capacity": 0,
  "forward_planned_flow": -2310,
  "reverse_planned_flow": -2310,
  "actual_flow": -2340,
  "forward_expanded_operating_capacity": 0,
  "reverse_expanded_operating_capacity": 0,
  "datetime": "2021-03-18 22:15:00",
  "url": "https://occtonet3.occto.or.jp/public/dfw/RP11/OCCTO/SD/CA01S070C",
  "md5_id": "1435ae1f723736b5d804f0736026e09"
}
```

#### occto_event
```json
{
  "datetime": "2024-11-03 12:00:00",
  "area": "関西",
  "description": "検証結果と合わせて公表（関西エリア）",
  "value": 1298.308,
  "url": "https://occtonet3.occto.or.jp/public/dfw/RP11/OCCTO/SD/CD01S010C",
  "md5_id": "c0c1ed7f116cc820af912f57a51386f8"
}
```

#### tdgc
```json
{
  "datetime": "2025-04-04 18:00:00",
  "Area": "四国",
  "CorrectedUnitPriceAve": 0.36,
  "CorrectedUnitPriceMax": 0.36,
  "CorrectedUnitPriceMin": 0.36,
  "InAreaQuantity": 3,
  "OfferCount": 1,
  "OfferCountQuantityInTotal": 5,
  "OfferIdCount": 1,
  "OfferIdCountQuantityInTotal": 3,
  "ReserveRequirement": 3,
  "TotalContractQuantity": 3,
  "TsoPriceAve": 0.36,
  "TsoPriceMax": 0.36,
  "TsoPriceMin": 0.36,
  "CommodityCategory": "3200",
  "data_type": "result",
  "missing_flag": "0",
  "url": "https://www.eprx.or.jp/information/2025_3-2_result.zip",
  "md5_id": "ca8b7f509a80fc85fdf5b7de68740ffa"
}
```

#### weather_actual
```json
{
  "get_datetime": "2025-12-28T20:12:57.522362+00:00",
  "weather_datetime": "2025-06-30T01:00:00+00:00",
  "region": "chubu",
  "area": "中部",
  "city": "名古屋",
  "temperature": 30.1,
  "rainfall": 0,
  "snowfall": 0,
  "wind_speed": 2.5,
  "wind_direction": "西南西",
  "relative_humidity": 65,
  "weather_id": 3,
  "clouds_all": 71,
  "source": "weather_actual_import",
  "ingested_at": "2026-01-09T03:01:10.291829+00:00"
}
```

#### weather_forecast
```json
{
  "get_datetime": "2025-12-18T08:38:53.920851+00:00",
  "weather_datetime": "2025-10-01T07:00:00+09:00",
  "region": "chubu",
  "area": "中部",
  "city": "名古屋",
  "temperature": null,
  "rainfall": null,
  "snowfall": 0,
  "wind_speed": null,
  "wind_direction": "北",
  "relative_humidity": null,
  "weather_id": 4,
  "clouds_all": null,
  "source": "weather_import",
  "ingested_at": "2025-12-18T08:39:02.555067+00:00"
}
```

## Link

> Here's port `8787` is an example. You can define it in `.env` file.

- Admin: http://localhost:8787/api/__hidden_admin/

- Redoc: http://localhost:8787/api/__hidden_redoc

- Swagger: http://localhost:8787/api/__hidden_swagger