from rest_framework import serializers
from area.models import Area

class AreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Area
        fields = ['id', 'name', 'name_ch', 'name_jp']
