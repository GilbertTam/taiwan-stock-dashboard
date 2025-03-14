from django.db import models
from area.models import Area

class WeatherBase(models.Model):
    """天氣資料的基礎模型（抽象類）"""
    area = models.ForeignKey(
        Area,
        on_delete=models.CASCADE,
        help_text="關聯的電力區域"
    )
    weather_datetime = models.DateTimeField(
        help_text="天氣資料的時間"
    )
    temperature = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="溫度(攝氏)"
    )
    rainfall = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        help_text="降雨量(mm)"
    )
    snowfall = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        help_text="降雪量(cm)"
    )
    wind_speed = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="風速(m/s)"
    )
    wind_direction = models.CharField(
        max_length=20,
        help_text="風向"
    )
    relative_humidity = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="相對濕度(%)"
    )
    weather_id = models.PositiveSmallIntegerField(
        help_text="天氣狀況代碼"
    )
    city = models.CharField(
        max_length=50,
        help_text="城市名稱"
    )

    class Meta:
        abstract = True

class ActualWeather(WeatherBase):
    """實際天氣資料"""
    deepest_snow = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        help_text="積雪深度(cm)"
    )
    sunshine_hours = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        help_text="日照時數(小時)"
    )

    class Meta:
        verbose_name = "實際天氣資料"
        verbose_name_plural = "實際天氣資料"
        # 確保每個區域在特定時間只有一筆資料
        unique_together = ['area', 'weather_datetime', 'city']
        indexes = [
            models.Index(fields=['weather_datetime', 'area']),
            models.Index(fields=['city', 'weather_datetime']),
        ]
        ordering = ['weather_datetime', 'area']
        # 設定資料表名稱
        db_table = "actual_weather"


    def __str__(self):
        return f"{self.city} {self.weather_datetime:%Y-%m-%d %H:%M} {self.temperature}°C"

class WeatherForecast(WeatherBase):
    """天氣預測資料"""
    get_datetime = models.DateTimeField(
        help_text="預測資料獲取時間"
    )
    clouds_all = models.PositiveSmallIntegerField(
        help_text="雲量(%)",
        null=True,
        blank=True
    )

    class Meta:
        verbose_name = "天氣預測資料"
        verbose_name_plural = "天氣預測資料"
        # 確保每個區域在特定預測時間只有一筆特定獲取時間的預測資料
        unique_together = ['area', 'weather_datetime', 'get_datetime', 'city']
        indexes = [
            models.Index(fields=['weather_datetime', 'area']),
            models.Index(fields=['get_datetime']),
            models.Index(fields=['city', 'weather_datetime']),
        ]
        ordering = ['get_datetime', 'weather_datetime', 'area']
        # 設定資料表名稱
        db_table = "weather_forecast"

    def __str__(self):
        return f"{self.city} 在 {self.get_datetime:%Y-%m-%d %H:%M} 預測 {self.weather_datetime:%Y-%m-%d %H:%M} 的天氣"
