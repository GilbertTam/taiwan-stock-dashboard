from rest_framework import serializers
from .models import QuickAreaPricePredict

class QuickAreaPricePredictSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='area.name', read_only=True)
    name_ch = serializers.CharField(source='area.name_ch', read_only=True)
    name_jp = serializers.CharField(source='area.name_jp', read_only=True)
    
    class Meta:
        model = QuickAreaPricePredict
        fields = [
            'id', 'trade_date', 'time_code', 'calculating_date',
            'name', 'name_ch', 'name_jp',
            'price_5', 'price_50', 'price_95'
        ]
