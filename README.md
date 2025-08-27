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

## Link

> Here's port `8787` is an example. You can define it in `.env` file.

- Admin: http://localhost:8787/api/__hidden_admin/

- Redoc: http://localhost:8787/api/__hidden_redoc

- Swagger: http://localhost:8787/api/__hidden_swagger