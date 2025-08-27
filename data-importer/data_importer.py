import pandas as pd
import requests
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
import argparse

class DataImporter:
    """
    Universal Data Importer for converting CSV data in different formats to standard prediction format 
    and uploading to the API
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the data importer
        
        Args:
            config: Configuration dictionary containing data processing and API settings
        """
        self.config = config
        self.base_url = config.get('base_url', 'http://localhost:8787/api')
        self.model_name = config.get('model_name', 'CustomModel')
        self.model_version = config.get('model_version', '1.0.0')
        self.area_name = config.get('area_name', 'tokyo')
        
    def get_token(self) -> Optional[str]:
        """Get API authentication token"""
        token_url = f"{self.base_url}/auth/token"
        credentials = {
            "username": self.config.get('username', 'admin'),
            "password": self.config.get('password', '1234')
        }
        
        try:
            response = requests.post(token_url, json=credentials)
            response.raise_for_status()
            
            token_data = response.json()
            if "access_token" in token_data:
                return token_data["access_token"]
            else:
                print("Warning: Could not find access token in response, using entire response as token")
                return token_data
        except Exception as e:
            print(f"Failed to get token: {str(e)}")
            return None
    
    def read_csv_data(self, file_path: str, encoding: str = 'utf-8') -> pd.DataFrame:
        """Read CSV file"""
        try:
            df = pd.read_csv(file_path, encoding=encoding)
            print(f"Successfully read CSV file: {file_path}")
            print(f"Data rows: {len(df)}")
            print(f"Data columns: {list(df.columns)}")
            return df
        except Exception as e:
            print(f"Failed to read CSV file: {str(e)}")
            raise
    
    def process_data(self, df: pd.DataFrame, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Process data and convert to standard prediction format
        
        Args:
            df: Original DataFrame
            config: Data processing configuration
            
        Returns:
            List of prediction data
        """
        # Get configuration parameters
        datetime_col = config['datetime_column']
        price_col = config['price_column']
        price_5_col = config.get('price_5_column')
        price_95_col = config.get('price_95_column')
        datetime_format = config.get('datetime_format', '%Y-%m-%d %H:%M:%S')
        skip_rows = config.get('skip_rows', 0)
        
        # Convert datetime format
        df[datetime_col] = pd.to_datetime(df[datetime_col], format=datetime_format)
        
        # Find data with prediction values
        forecast_data = df[df[price_col].notna()].copy()
        
        if len(forecast_data) == 0:
            raise ValueError(f"No valid prediction data found in column '{price_col}'")
        
        # Skip specified number of rows
        if skip_rows > 0 and len(forecast_data) > skip_rows:
            forecast_data = forecast_data.iloc[skip_rows:]
            print(f"Skipped first {skip_rows} rows of data")
        
        # Find the earliest date with prediction values as calculating_date
        calculating_date = forecast_data[datetime_col].min().strftime('%Y-%m-%d')
        print(f"Calculating date: {calculating_date}")
        
        # Prepare prediction data
        predictions = []
        for idx, row in forecast_data.iterrows():
            # Extract date and time
            trade_date = row[datetime_col].strftime('%Y-%m-%d')
            hour = row[datetime_col].hour
            minute = row[datetime_col].minute
            
            # Calculate time code (30 minutes per time code)
            time_code = hour * 2 + (minute // 30) + 1
            
            # Create prediction item
            prediction_item = {
                "trade_date": trade_date,
                "time_code": time_code,
                "area_name": self.area_name,
                "price_50": float(row[price_col])
            }
            
            # Add price_5 and price_95 if columns exist
            if price_5_col and price_5_col in row and pd.notna(row[price_5_col]):
                prediction_item["price_5"] = float(row[price_5_col])
            
            if price_95_col and price_95_col in row and pd.notna(row[price_95_col]):
                prediction_item["price_95"] = float(row[price_95_col])
            
            predictions.append(prediction_item)
        
        return predictions
    
    def create_upload_data(self, predictions: List[Dict[str, Any]], calculating_date: str) -> Dict[str, Any]:
        """Create upload data structure"""
        return {
            "model_name": self.model_name,
            "model_version": self.model_version,
            "calculating_date": calculating_date,
            "predictions": predictions
        }
    
    def upload_to_api(self, upload_data: Dict[str, Any]) -> bool:
        """Upload data to API"""
        try:
            token = self.get_token()
            if not token:
                print("Unable to get token, upload terminated")
                return False
            
            print("Successfully obtained token")
            
            api_url = f"{self.base_url}/custom-predict/upload-predictions"
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {token}'
            }
            
            response = requests.post(api_url, json=upload_data, headers=headers)
            
            if response.status_code in [200, 201]:
                print("Data upload successful!")
                print(response.json())
                return True
            else:
                print(f"Upload failed, status code: {response.status_code}")
                print(response.text)
                return False
                
        except Exception as e:
            print(f"Error occurred during upload: {str(e)}")
            return False
    
    def run(self, csv_file: str, upload: bool = False):
        """
        Execute complete data import workflow
        
        Args:
            csv_file: CSV file path
            upload: Whether to upload to API
        """
        # Read CSV
        df = self.read_csv_data(csv_file)
        
        # Process data
        predictions = self.process_data(df, self.config)
        
        if len(predictions) == 0:
            print("No prediction data generated")
            return
        
        # Get calculating date
        datetime_col = self.config['datetime_column']
        calculating_date = df[datetime_col].min().strftime('%Y-%m-%d')
        
        # Create upload data
        upload_data = self.create_upload_data(predictions, calculating_date)
        
        # Output preview
        print(f"Total of {len(predictions)} prediction records prepared")
        print("JSON data preview (first 5 records):")
        print(json.dumps(predictions[:5], indent=2))

        # Upload to API
        if upload:
            self.upload_to_api(upload_data)


def create_config_from_args() -> Dict[str, Any]:
    """Create configuration from command line arguments"""
    parser = argparse.ArgumentParser(description='Universal Data Importer')
    parser.add_argument('csv_file', help='CSV file path')
    parser.add_argument('--config', help='Configuration file path (JSON format)')
    parser.add_argument('--no-upload', action='store_true', help='Do not upload to API')
    
    args = parser.parse_args()
    
    # If configuration file is provided, read it
    if args.config:
        with open(args.config, 'r', encoding='utf-8') as f:
            config = json.load(f)
    else:
        # Use default configuration
        config = {
            'base_url': 'http://localhost:8787/api',
            'username': 'admin',
            'password': '1234',
            'model_name': 'CustomModel',
            'model_version': '1.0.0',
            'area_name': 'tokyo',
            'datetime_column': 'DateTime',
            'price_column': 'Series',
            'datetime_format': '%Y-%m-%d %H:%M:%S'
        }
    
    return config, args


if __name__ == "__main__":
    # Get configuration and arguments from command line
    config, args = create_config_from_args()
    
    # Create data importer
    importer = DataImporter(config)
    
    # Execute import
    importer.run(
        csv_file=args.csv_file,
        upload=not args.no_upload
    )
