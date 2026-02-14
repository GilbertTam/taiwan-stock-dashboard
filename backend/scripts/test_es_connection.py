import sys
import os
from elasticsearch import Elasticsearch

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings

def test_connection():
    try:
        es = Elasticsearch(
            [f"{settings.ELASTICSEARCH_HOST}:{settings.ELASTICSEARCH_PORT}"],
            basic_auth=(settings.ELASTICSEARCH_USERNAME, settings.ELASTICSEARCH_PASSWORD) if settings.ELASTICSEARCH_USERNAME else None,
            verify_certs=True
        )
        if es.ping():
            print("Successfully connected to Elasticsearch!")
            print(f"Info: {es.info()}")
        else:
            print("Could not connect to Elasticsearch.")
    except Exception as e:
        print(f"Error connecting to Elasticsearch: {e}")

if __name__ == "__main__":
    test_connection()
