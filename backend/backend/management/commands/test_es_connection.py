from django.core.management.base import BaseCommand
from elasticsearch import Elasticsearch
from django.conf import settings
import sys

class Command(BaseCommand):
    help = 'Test Elasticsearch connection and indices'

    def handle(self, *args, **options):
        self.stdout.write('Testing Elasticsearch connection...')
        
        try:

            # Auth config
            http_auth = None
            if settings.ELASTICSEARCH_USERNAME:
                http_auth = (settings.ELASTICSEARCH_USERNAME, settings.ELASTICSEARCH_PASSWORD)
                self.stdout.write(f'Using authentication with user: {settings.ELASTICSEARCH_USERNAME}')

            # Initialize client
            es = Elasticsearch(
                [f"{settings.ELASTICSEARCH_HOST}:{settings.ELASTICSEARCH_PORT}"],
                basic_auth=http_auth,
                verify_certs=True,
                request_timeout=60
            )

            # Test connection
            if es.ping():
                self.stdout.write(self.style.SUCCESS(f'Successfully connected to Elasticsearch at {settings.ELASTICSEARCH_HOST}:{settings.ELASTICSEARCH_PORT}'))
                
                # Check cluster info
                info = es.info()
                self.stdout.write(f"Cluster: {info.get('cluster_name')}")
                self.stdout.write(f"Version: {info.get('version', {}).get('number')}")

                # Check specific indices
                indices_to_check = ['prediction', 'jepx_spot_nightly']
                
                for index in indices_to_check:
                    if es.indices.exists(index=index):
                        count = es.count(index=index)['count']
                        self.stdout.write(self.style.SUCCESS(f"Index '{index}' exists. Document count: {count}"))
                        
                        # Show a sample document
                        try:
                            sample = es.search(index=index, size=1)
                            if sample['hits']['hits']:
                                self.stdout.write(f"Sample doc from '{index}':")
                                self.stdout.write(str(sample['hits']['hits'][0]['_source'])[:200] + "...")
                        except Exception as e:
                            self.stdout.write(self.style.WARNING(f"Could not fetch sample from '{index}': {str(e)}"))
                            
                    else:
                        self.stdout.write(self.style.ERROR(f"Index '{index}' NOT FOUND"))
                        
            else:
                self.stdout.write(self.style.ERROR(f'Could not connect to Elasticsearch at {settings.ELASTICSEARCH_HOST}:{settings.ELASTICSEARCH_PORT}'))
                sys.exit(1)
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error connecting to Elasticsearch: {str(e)}'))
            sys.exit(1)
