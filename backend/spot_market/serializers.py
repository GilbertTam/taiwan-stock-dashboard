from rest_framework import serializers

class SpotTradeSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    trade_date = serializers.DateField()
    time_code = serializers.IntegerField()
    sell_quantity = serializers.IntegerField()
    buy_quantity = serializers.IntegerField()
    contract_quantity = serializers.IntegerField()
    system_price = serializers.FloatField()
    name = serializers.CharField(help_text="Area Name")
    name_ch = serializers.CharField(help_text="Area Name CH")
    name_jp = serializers.CharField(help_text="Area Name JP")
    price = serializers.FloatField()
    avoidable_cost = serializers.FloatField(required=False)
