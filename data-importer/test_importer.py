#!/usr/bin/env python3
"""
Test script for the Universal Data Importer
Tests basic functionality without requiring API connection
"""

import json
import os
import sys
from pathlib import Path

# Add current directory to path for imports
sys.path.append(str(Path(__file__).parent))

from data_importer import DataImporter

def test_data_processing():
    """Test data processing functionality"""
    print("🧪 Testing Data Processing...")
    
    # Test configuration
    test_config = {
        'base_url': 'http://localhost:8787/api',
        'username': 'admin',
        'password': '1234',
        'model_name': 'TestModel',
        'model_version': '1.0.0',
        'area_name': 'tokyo',
        'datetime_column': 'DateTime',
        'price_column': 'Price',
        'price_5_column': 'Price_5',
        'price_95_column': 'Price_95',
        'datetime_format': '%Y-%m-%d %H:%M:%S',
        'skip_rows': 0
    }
    
    # Create importer
    importer = DataImporter(test_config)
    
    # Test CSV file path
    sample_file = Path(__file__).parent / 'sample_data' / 'sample_data.csv'
    
    if not sample_file.exists():
        print(f"❌ Sample data file not found: {sample_file}")
        return False
    
    try:
        # Read CSV data
        df = importer.read_csv_data(str(sample_file))
        print(f"✅ CSV read successful: {len(df)} rows, {len(df.columns)} columns")
        
        # Process data
        predictions = importer.process_data(df, test_config)
        print(f"✅ Data processing successful: {len(predictions)} predictions generated")
        
        # Test JSON creation
        calculating_date = df['DateTime'].min().strftime('%Y-%m-%d')
        upload_data = importer.create_upload_data(predictions, calculating_date)
        
        # Save test output
        test_output = Path(__file__).parent / 'test_output.json'
        importer.save_json(upload_data, str(test_output))
        print(f"✅ Test output saved to: {test_output}")
        
        # Show sample prediction
        if predictions:
            print("\n📊 Sample prediction:")
            print(json.dumps(predictions[0], indent=2))
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        return False

def test_configuration_files():
    """Test configuration file loading"""
    print("\n🔧 Testing Configuration Files...")
    
    config_dir = Path(__file__).parent / 'config_examples'
    
    if not config_dir.exists():
        print(f"❌ Config examples directory not found: {config_dir}")
        return False
    
    config_files = list(config_dir.glob('*.json'))
    
    if not config_files:
        print("❌ No configuration files found")
        return False
    
    for config_file in config_files:
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            # Validate required fields
            required_fields = ['datetime_column', 'price_column']
            missing_fields = [field for field in required_fields if field not in config]
            
            if missing_fields:
                print(f"❌ {config_file.name}: Missing required fields: {missing_fields}")
            else:
                print(f"✅ {config_file.name}: Configuration valid")
                
        except Exception as e:
            print(f"❌ {config_file.name}: Error loading config - {str(e)}")
    
    return True

def main():
    """Main test function"""
    print("🚀 Universal Data Importer Test Suite")
    print("=" * 50)
    
    # Test data processing
    processing_success = test_data_processing()
    
    # Test configuration files
    config_success = test_configuration_files()
    
    print("\n" + "=" * 50)
    
    if processing_success and config_success:
        print("🎉 All tests passed! The data importer is working correctly.")
        print("\n💡 Next steps:")
        print("1. Check the generated test_output.json file")
        print("2. Try importing with different configurations")
        print("3. Test with your own CSV data")
    else:
        print("❌ Some tests failed. Please check the error messages above.")
    
    print("\n📚 For more information, see README.md")

if __name__ == "__main__":
    main()
