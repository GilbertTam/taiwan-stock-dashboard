from rest_framework import serializers
from .models import ActualWeather, WeatherForecast

class WeatherBaseSerializer(serializers.ModelSerializer):
    area_name = serializers.CharField(source='area.name', read_only=True)
    area_name_jp = serializers.CharField(source='area.name_jp', read_only=True)

    class Meta:
        abstract = True
        fields = [
            'area_name', 'area_name_jp', 'weather_datetime', 
            'temperature', 'rainfall', 'snowfall', 'wind_speed',
            'wind_direction', 'relative_humidity', 'weather_id', 'city'
        ]

class ActualWeatherSerializer(serializers.ModelSerializer):
    area_name = serializers.CharField(source='area.name', read_only=True)
    area_name_jp = serializers.CharField(source='area.name_jp', read_only=True)
    
    class Meta:
        model = ActualWeather
        fields = [
            'area_name', 'area_name_jp', 'weather_datetime', 
            'temperature', 'rainfall', 'snowfall', 'wind_speed',
            'wind_direction', 'relative_humidity', 'weather_id', 'city',
            'deepest_snow', 'sunshine_hours'
        ]

class WeatherForecastSerializer(serializers.ModelSerializer):
    area_name = serializers.CharField(source='area.name', read_only=True)
    area_name_jp = serializers.CharField(source='area.name_jp', read_only=True)
    
    class Meta:
        model = WeatherForecast
        fields = [
            'area_name', 'area_name_jp', 'weather_datetime', 
            'temperature', 'rainfall', 'snowfall', 'wind_speed',
            'wind_direction', 'relative_humidity', 'weather_id', 'city',
            'get_datetime', 'clouds_all'
        ]
