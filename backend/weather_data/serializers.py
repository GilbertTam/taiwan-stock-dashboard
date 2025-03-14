from rest_framework import serializers
from .models import ActualWeather, WeatherForecast

class WeatherBaseSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='area.name', read_only=True)
    name_jp = serializers.CharField(source='area.name_jp', read_only=True)
    name_ch = serializers.CharField(source='area.name_ch', read_only=True)

    class Meta:
        abstract = True
        fields = [
            'name', 'name_jp', 'name_ch', 'weather_datetime', 
            'temperature', 'rainfall', 'snowfall', 'wind_speed',
            'wind_direction', 'relative_humidity', 'weather_id', 'city'
        ]

class ActualWeatherSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='area.name', read_only=True)
    name_jp = serializers.CharField(source='area.name_jp', read_only=True)
    name_ch = serializers.CharField(source='area.name_ch', read_only=True)

    class Meta:
        model = ActualWeather
        fields = [
            'name', 'name_jp', 'name_ch', 'weather_datetime', 
            'temperature', 'rainfall', 'snowfall', 'wind_speed',
            'wind_direction', 'relative_humidity', 'weather_id', 'city',
            'deepest_snow', 'sunshine_hours'
        ]

class WeatherForecastSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='area.name', read_only=True)
    name_jp = serializers.CharField(source='area.name_jp', read_only=True)
    name_ch = serializers.CharField(source='area.name_ch', read_only=True)
    
    class Meta:
        model = WeatherForecast
        fields = [
            'name', 'name_jp', 'name_ch', 'weather_datetime', 
            'temperature', 'rainfall', 'snowfall', 'wind_speed',
            'wind_direction', 'relative_humidity', 'weather_id', 'city',
            'get_datetime', 'clouds_all'
        ]
