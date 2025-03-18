from rest_framework import serializers
from custom_spot_market_predict.models import PredictionModel, CustomAreaPricePredict
from area.models import Area

class PredictionModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = PredictionModel
        fields = ['id', 'name', 'version', 'description', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

class CustomAreaPricePredictSerializer(serializers.ModelSerializer):
    area_name = serializers.CharField(source='area.name', read_only=True)
    area_name_ch = serializers.CharField(source='area.name_ch', read_only=True)
    area_name_jp = serializers.CharField(source='area.name_jp', read_only=True)
    model_name = serializers.CharField(source='model.name', read_only=True)
    model_version = serializers.CharField(source='model.version', read_only=True)
    
    class Meta:
        model = CustomAreaPricePredict
        fields = [
            'id', 'model', 'model_name', 'model_version',
            'trade_date', 'time_code', 'calculating_date',
            'area', 'area_name', 'area_name_ch', 'area_name_jp',
            'price_5', 'price_50', 'price_95', 'additional_data'
        ]
        read_only_fields = ['id', 'model_name', 'model_version', 'area_name', 'area_name_ch', 'area_name_jp']


class PredictionItemSerializer(serializers.Serializer):
    trade_date = serializers.DateField(required=True, help_text="交易日期")
    time_code = serializers.IntegerField(required=True, help_text="時段代碼")
    area_name = serializers.CharField(required=True, help_text="區域名稱")
    price_50 = serializers.FloatField(required=True, help_text="50%分位數預測價格")
    price_5 = serializers.FloatField(required=False, help_text="5%分位數預測價格")
    price_95 = serializers.FloatField(required=False, help_text="95%分位數預測價格")
    additional_data = serializers.JSONField(required=False, help_text="額外JSON格式資料")

class CustomAreaPricePredictBulkCreateSerializer(serializers.Serializer):
    model_name = serializers.CharField(required=True, help_text="模型名稱")
    model_version = serializers.CharField(required=True, help_text="模型版本")
    calculating_date = serializers.DateField(required=True, help_text="預測計算日期")
    predictions = serializers.ListField(
        child=PredictionItemSerializer(),
        required=True,
        help_text="預測資料列表",
    )

    def validate(self, data):
        # 檢查模型是否存在，如果不存在則創建
        model_name = data.get('model_name')
        model_version = data.get('model_version')
        
        model, created = PredictionModel.objects.get_or_create(
            name=model_name,
            version=model_version,
            defaults={'description': f'自動新增 {model_name} v{model_version} 模型'}
        )
        
        # 驗證預測資料
        predictions = data.get('predictions', [])
        if not predictions:
            raise serializers.ValidationError("預測資料列表不能為空")
        
        for i, prediction in enumerate(predictions):
            # 檢查區域是否存在
            area_name = prediction.get('area_name')
            try:
                area = Area.objects.get(name=area_name)
            except Area.DoesNotExist:
                raise serializers.ValidationError(f"預測資料 #{i+1} 中的區域 '{area_name}' 不存在")
            
            # 將區域對象添加到預測資料中
            prediction['area'] = area
        
        # 將模型對象添加到資料中
        data['model'] = model
        
        return data