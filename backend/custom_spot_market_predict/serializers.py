from rest_framework import serializers

class PredictionModelSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    name = serializers.CharField()
    version = serializers.CharField()
    description = serializers.CharField(required=False, allow_blank=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

class CustomAreaPricePredictSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    model_name = serializers.CharField()
    model_version = serializers.CharField()
    trade_date = serializers.DateField()
    time_code = serializers.IntegerField()
    calculating_date = serializers.DateField()
    area_name = serializers.CharField()
    area_name_ch = serializers.CharField()
    area_name_jp = serializers.CharField()
    price_5 = serializers.FloatField(required=False, allow_null=True)
    price_50 = serializers.FloatField()
    price_95 = serializers.FloatField(required=False, allow_null=True)
    additional_data = serializers.JSONField(required=False, allow_null=True)

class AvailableCalculatingDateSerializer(serializers.Serializer):
    calculating_date = serializers.DateField()
