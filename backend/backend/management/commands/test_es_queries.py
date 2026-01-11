from django.core.management.base import BaseCommand
from common.es_service import ESService
import json

class Command(BaseCommand):
    help = 'Test Elasticsearch queries via ESService'

    def add_arguments(self, parser):
        parser.add_argument('--start', type=str, default='20240520', help='Start date YYYYMMDD')
        parser.add_argument('--end', type=str, default='20240520', help='End date YYYYMMDD')
        parser.add_argument('--area', type=str, default='tokyo', help='Area name (EN)')
        parser.add_argument('--model', type=str, default='quick', help='Model source name')

    def handle(self, *args, **options):
        start_date = options['start']
        end_date = options['end']
        area_name = options['area']
        model_name = options['model']

        self.stdout.write(f"Testing queries for:")
        self.stdout.write(f"  Date Range: {start_date} - {end_date}")
        self.stdout.write(f"  Area: {area_name}")
        self.stdout.write(f"  Model: {model_name}")
        self.stdout.write("-" * 50)

        es_service = ESService()

        # 1. Test get_available_models
        self.stdout.write("\n1. Testing get_available_models()...")
        try:
            models = es_service.get_available_models()
            self.stdout.write(self.style.SUCCESS(f"Found {len(models)} models"))
            for m in models:
                self.stdout.write(f"  - {m['name']}")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {e}"))

        # 2. Test get_available_calculating_dates
        self.stdout.write("\n2. Testing get_available_calculating_dates()...")
        try:
            calc_dates = es_service.get_available_calculating_dates(
                start_date=start_date,
                end_date=end_date,
                area_name=area_name,
                model_name=model_name,
                model_version='1.0.0'
            )
            self.stdout.write(self.style.SUCCESS(f"Found {len(calc_dates)} calculating dates"))
            if calc_dates:
                self.stdout.write(f"  Sample: {[d['calculating_date'] for d in calc_dates[:5]]}")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {e}"))

        # 3. Test get_predictions
        self.stdout.write("\n3. Testing get_predictions()...")
        try:
            predictions = es_service.get_predictions(
                start_date=start_date,
                end_date=end_date,
                area_name=area_name,
                model_name=model_name,
                model_version='1.0.0',
                latest_only=True
            )
            self.stdout.write(self.style.SUCCESS(f"Found {len(predictions)} predictions"))
            if predictions:
                self.stdout.write("  Sample Prediction:")
                self.stdout.write(json.dumps(predictions[0], indent=2, default=str))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {e}"))

        # 4. Test get_jepx_trades
        self.stdout.write("\n4. Testing get_jepx_trades() (JEPX Spot Data)...")
        try:
            # Adjust query dates for JEPX as sample data was 2022
            jepx_start = '20220908'
            jepx_end = '20220908'
            self.stdout.write(f"  (Using JEPX specific dates: {jepx_start} - {jepx_end})")
            
            trades = es_service.get_jepx_trades(
                start_date=jepx_start,
                end_date=jepx_end,
                area_name=area_name
            )
            self.stdout.write(self.style.SUCCESS(f"Found {len(trades)} trades"))
            if trades:
                self.stdout.write("  Sample Trade:")
                self.stdout.write(json.dumps(trades[0], indent=2, default=str))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {e}"))
