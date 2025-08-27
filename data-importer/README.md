# Universal Data Importer

A powerful and flexible data import tool for converting CSV data in various formats to standard prediction format and uploading to the JP Electricity Price Dashboard API.

## Features

- **Universal CSV Support**: Handle CSV files with different column names and formats
- **Flexible Configuration**: JSON-based configuration for easy customization
- **API Integration**: Direct upload to the dashboard API with authentication
- **Data Validation**: Automatic data validation and error handling
- **Multiple Output Formats**: Generate JSON files and/or upload directly to API
- **Batch Processing**: Support for large datasets with configurable row skipping

## Installation

1. Ensure you have Python 3.7+ installed
2. Install required dependencies:

```bash
pip install -r requirements.txt
```

## Quick Start

### Basic Usage

```bash
# Import data with default configuration
python data_importer.py your_data.csv

# Import data with custom configuration
python data_importer.py your_data.csv --config config.json

# Import data without uploading to API (test mode)
python data_importer.py your_data.csv --no-upload
```

### Configuration File Format

Create a JSON configuration file (e.g., `config.json`):

```json
{
  "base_url": "http://localhost:8787/api",
  "username": "admin",
  "password": "1234",
  "model_name": "CustomModel",
  "model_version": "1.0.0",
  "area_name": "tokyo",
  "datetime_column": "DateTime",
  "price_column": "Price",
  "price_5_column": "Price_5",
  "price_95_column": "Price_95",
  "datetime_format": "%Y-%m-%d %H:%M:%S",
  "skip_rows": 0
}
```

### Configuration Parameters

| Parameter | Description | Default | Required |
|-----------|-------------|---------|----------|
| `base_url` | API base URL | `http://localhost:8787/api` | No |
| `username` | API username | `admin` | No |
| `password` | API password | `1234` | No |
| `model_name` | Name of the prediction model | `CustomModel` | No |
| `model_version` | Version of the prediction model | `1.0.0` | No |
| `area_name` | Area name for predictions | `tokyo` | No |
| `datetime_column` | CSV column name for datetime | - | **Yes** |
| `price_column` | CSV column name for price | - | **Yes** |
| `price_5_column` | CSV column name for 5th percentile price | - | No |
| `price_95_column` | CSV column name for 95th percentile price | - | No |
| `datetime_format` | Python datetime format string | `%Y-%m-%d %H:%M:%S` | No |
| `skip_rows` | Number of rows to skip from beginning | `0` | No |

## CSV Format Requirements

### Required Columns

- **Datetime Column**: Must contain valid datetime values
- **Price Column**: Must contain numeric price values

### Optional Columns

- **Price 5th Percentile**: For confidence interval lower bound
- **Price 95th Percentile**: For confidence interval upper bound

### Example CSV Structure

```csv
DateTime,Price,Price_5,Price_95
2024-01-01 00:00:00,25.5,24.0,27.0
2024-01-01 00:30:00,26.2,25.1,27.3
2024-01-01 01:00:00,24.8,23.5,26.1
```

## Usage Examples

### 1. Custom Data Import

```python
from data_importer import DataImporter

config = {
    'datetime_column': 'Time',
    'price_column': 'Value',
    'datetime_format': '%Y-%m-%d %H:%M',
    'model_name': 'MyModel',
    'area_name': 'osaka'
}

importer = DataImporter(config)
importer.run('data.csv', upload=True)
```

### 2. Spot Market Data

```python
config = {
    'datetime_column': 'DateTime',
    'price_column': 'Price',
    'price_5_column': 'Price_5',
    'price_95_column': 'Price_95',
    'model_name': 'SpotMarketModel',
    'skip_rows': 1
}

importer = DataImporter(config)
importer.run('spot_market.csv')
```


## Command Line Interface

### Arguments

- `csv_file`: Path to the CSV file (required)
- `--config`: Path to configuration JSON file
- `--output`: Output JSON filename
- `--no-upload`: Skip API upload (test mode)

### Examples

```bash
# Basic import
python data_importer.py data.csv

# Custom configuration
python data_importer.py data.csv --config my_config.json

# Custom output file
python data_importer.py data.csv --output results.json

# Test mode (no upload)
python data_importer.py data.csv --no-upload

# Full custom import
python data_importer.py data.csv --config config.json --output output.json --no-upload
```

## Data Processing

### Time Code Calculation

The importer automatically calculates time codes based on datetime values:
- Each 30-minute interval gets a unique time code
- Time codes start from 1 and increment by 1 for each interval
- Formula: `hour * 2 + (minute // 30) + 1`

### Data Validation

- Checks for required columns
- Validates datetime format
- Ensures price values are numeric
- Handles missing or invalid data gracefully

### Output Format

The importer generates data in the following structure:

```json
{
  "model_name": "CustomModel",
  "model_version": "1.0.0",
  "calculating_date": "2024-01-01",
  "predictions": [
    {
      "trade_date": "2024-01-01",
      "time_code": 1,
      "area_name": "tokyo",
      "price_50": 25.5,
      "price_5": 24.0,
      "price_95": 27.0
    }
  ]
}
```

## Error Handling

### Common Issues

1. **Authentication Failed**: Check username/password in configuration
2. **Invalid CSV Format**: Verify column names and data types
3. **API Connection Error**: Ensure the API server is running
4. **Data Validation Error**: Check datetime format and price values

### Debug Mode

Use the `--no-upload` flag to test data processing without API calls:

```bash
python data_importer.py data.csv --no-upload
```

This will:
- Process the CSV file
- Generate JSON output
- Skip API upload
- Show detailed processing information

## Integration with JP Electricity Price Dashboard

The data importer is designed to work seamlessly with the dashboard:

- **API Endpoint**: `/custom-predict/upload-predictions`
- **Authentication**: JWT token-based authentication
- **Data Format**: Compatible with dashboard prediction models
- **Real-time Updates**: Immediate data availability after upload

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is part of the JP Electricity Price Dashboard and follows the same license terms.

## Support

For issues and questions:
1. Check the error messages and logs
2. Verify your configuration file
3. Ensure CSV format matches requirements
4. Check API server status and credentials
