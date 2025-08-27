#!/usr/bin/env python3
"""
Universal Data Importer Usage Examples
Demonstrates how to use the DataImporter class to process CSV data in different formats
"""

import json
from data_importer import DataImporter

def example_custom_import():
    """Example: Processing custom format data"""
    print("\n=== Custom Data Import Example ===")
    
    # Custom configuration
    custom_config = {
        'base_url': 'http://localhost:8787/api',
        'username': 'admin',
        'password': '1234',
        'model_name': 'CustomModel',
        'model_version': '1.0.0',
        'area_name': 'tokyo',
        'datetime_column': 'Time',  # Custom datetime column
        'price_column': 'Price',    # Custom price column
        'datetime_format': '%Y-%m-%d %H:%M',  # Custom datetime format
        'skip_rows': 0
    }
    
    print("Custom configuration:")
    print(json.dumps(custom_config, indent=2, ensure_ascii=False))
    
    print("\nTo use this configuration:")
    print("1. Save the configuration as config_custom.json")
    print("2. Prepare CSV file with matching format")
    print("3. Run: python data_importer.py your_data.csv --config config_custom.json")

def example_spot_market_import():
    """Example: Processing spot market data"""
    print("\n=== Spot Market Data Import Example ===")
    
    spot_market_config = {
        'base_url': 'http://localhost:8787/api',
        'username': 'admin',
        'password': '1234',
        'model_name': 'SpotMarketModel',
        'model_version': '2.0.0',
        'area_name': 'tokyo',
        'datetime_column': 'DateTime',
        'price_column': 'Price',
        'price_5_column': 'Price_5',
        'price_95_column': 'Price_95',
        'datetime_format': '%Y-%m-%d %H:%M:%S',
        'skip_rows': 1
    }
    
    print("Spot market configuration:")
    print(json.dumps(spot_market_config, indent=2, ensure_ascii=False))
    
    print("\nTo use this configuration:")
    print("1. Save the configuration as config_spot_market.json")
    print("2. Prepare CSV file with spot market data")
    print("3. Run: python data_importer.py spot_market_data.csv --config config_spot_market.json")

def main():
    """Main function"""
    print("🚀 Universal Data Importer Usage Examples")
    print("=" * 50)

    example_custom_import()
    example_spot_market_import()
    
    print("\n" + "=" * 50)
    print("📚 For more usage instructions, please refer to README.md")
    print("🔧 If you encounter issues, check the configuration file and CSV format")
    print("💡 You can also use the --no-upload flag to test without uploading to API")

if __name__ == "__main__":
    main()
