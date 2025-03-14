from rest_framework import serializers
from spot_market.models import SpotTrade, AreaPrice
from area.models import Area

class AreaPriceSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='area.name', read_only=True)
    name_ch = serializers.CharField(source='area.name_ch', read_only=True)
    name_jp = serializers.CharField(source='area.name_jp', read_only=True)
    
    class Meta:
        model = AreaPrice
        fields = [
            'name', 'name_ch', 'name_jp', 
            'price', 'avoidable_cost'
        ]

class SpotTradeSerializer(serializers.ModelSerializer):
    area_prices = AreaPriceSerializer(many=True, read_only=True)
    
    class Meta:
        model = SpotTrade
        fields = [
            'id', 'trade_date', 'time_code', 'sell_quantity', 
            'buy_quantity', 'contract_quantity', 'system_price', 
            'area_prices'
        ]

class SpotTradeWithAreaPriceSerializer(serializers.ModelSerializer):
    """包含特定區域價格的現貨交易序列化器"""
    name = serializers.SerializerMethodField()
    name_ch = serializers.SerializerMethodField()
    name_jp = serializers.SerializerMethodField()
    price = serializers.SerializerMethodField()
    avoidable_cost = serializers.SerializerMethodField()
    
    class Meta:
        model = SpotTrade
        fields = [
            'id', 'trade_date', 'time_code', 'sell_quantity', 
            'buy_quantity', 'contract_quantity', 'system_price',
            'name', 'name_ch', 'name_jp', 'price', 'avoidable_cost'
        ]
    
    def __init__(self, *args, **kwargs):
        # 從上下文中獲取區域
        self.area = kwargs.pop('context', {}).get('area', None)
        super().__init__(*args, **kwargs)
    
    def get_area_name(self, obj):
        if hasattr(obj, 'area_price'):
            return obj.area_price.area.name
        return None
    
    def get_area_name_ch(self, obj):
        if hasattr(obj, 'area_price'):
            return obj.area_price.area.name_ch
        return None
    
    def get_area_name_jp(self, obj):
        if hasattr(obj, 'area_price'):
            return obj.area_price.area.name_jp
        return None
    
    def get_price(self, obj):
        if hasattr(obj, 'area_price'):
            return obj.area_price.price
        return None
    
    def get_avoidable_cost(self, obj):
        if hasattr(obj, 'area_price'):
            return obj.area_price.avoidable_cost
        return None
