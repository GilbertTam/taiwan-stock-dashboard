from rest_framework import serializers
from area.models import Area
from area.constants import AREA_ORDER

class AreaListSerializer(serializers.ListSerializer):
    """用於處理區域列表並按照 AREA_ORDER 排序"""
    def to_representation(self, data):
        # 先使用父類別的方法將資料序列化
        data = super().to_representation(data)
        
        # 創建一個映射，鍵是區域名稱，值是完整的區域數據
        area_map = {item['name']: item for item in data}
        
        # 按照 AREA_ORDER 排序
        result = []
        for area_name in AREA_ORDER:
            if area_name in area_map:
                result.append(area_map[area_name])
                
        # 添加那些不在 AREA_ORDER 中的區域（如果有的話）
        for item in data:
            if item['name'] not in AREA_ORDER:
                result.append(item)
                
        return result

class AreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Area
        fields = ['id', 'name', 'name_ch', 'name_jp']
        list_serializer_class = AreaListSerializer