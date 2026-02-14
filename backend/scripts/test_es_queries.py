import sys
import os
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.es_service import ESService
from app.config import settings

def test_queries():
    print("Testing Elasticsearch Queries...")
    es = ESService()
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)
    
    s_str = start_date.strftime("%Y%m%d")
    e_str = end_date.strftime("%Y%m%d")
    
    print(f"Querying from {s_str} to {e_str}")

    try:
        # Test 1: JEPX Trades
        trades = es.get_jepx_trades(s_str, e_str)
        print(f"[JEPX Trades] Found {len(trades)} records.")
        
        # Test 2: Predictions
        # predictions = es.get_predictions(s_str, e_str, model_name="test_model")
        # print(f"[Predictions] Found {len(predictions)} records.")

        # Test 3: Imbalance
        imbalance = es.get_imbalance_data(s_str, e_str)
        print(f"[Imbalance] Found {len(imbalance)} records.")

    except Exception as e:
        print(f"Error executing queries: {e}")

if __name__ == "__main__":
    test_queries()
