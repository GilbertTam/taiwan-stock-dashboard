from django.contrib import admin
from django.db.models import Q
from django.utils import timezone
from .models import ActualWeather, WeatherForecast

class DateTimeFilter(admin.SimpleListFilter):
    """自定義時間過濾器"""
    title = '時間範圍'
    parameter_name = 'time_range'

    def lookups(self, request, model_admin):
        return (
            ('today', '今天'),
            ('yesterday', '昨天'),
            ('last_7_days', '最近7天'),
            ('last_30_days', '最近30天'),
            ('this_month', '本月'),
            ('last_month', '上個月'),
        )

    def queryset(self, request, queryset):
        now = timezone.now()
        if self.value() == 'today':
            return queryset.filter(weather_datetime__date=now.date())
        if self.value() == 'yesterday':
            yesterday = now - timezone.timedelta(days=1)
            return queryset.filter(weather_datetime__date=yesterday.date())
        if self.value() == 'last_7_days':
            last_week = now - timezone.timedelta(days=7)
            return queryset.filter(weather_datetime__gte=last_week)
        if self.value() == 'last_30_days':
            last_month = now - timezone.timedelta(days=30)
            return queryset.filter(weather_datetime__gte=last_month)
        if self.value() == 'this_month':
            return queryset.filter(weather_datetime__year=now.year,
                                 weather_datetime__month=now.month)
        if self.value() == 'last_month':
            if now.month == 1:
                return queryset.filter(weather_datetime__year=now.year-1,
                                     weather_datetime__month=12)
            return queryset.filter(weather_datetime__year=now.year,
                                 weather_datetime__month=now.month-1)

@admin.register(ActualWeather)
class ActualWeatherAdmin(admin.ModelAdmin):
    list_display = (
        'source',
        'weather_datetime',
        'city',
        'area',
        'temperature',
        'rainfall',
        'snowfall',
        'wind_speed',
        'wind_direction',
        'relative_humidity',
        'sunshine_hours',
    )
    list_filter = (
        DateTimeFilter,
        'city',
        'area',
        'weather_id',
        'wind_direction',
    )
    search_fields = (
        'source',
        'city',
        'area__name',
        'area__name_jp',
        'area__name_ch',
    )
    readonly_fields = ('created_at',) if hasattr(ActualWeather, 'created_at') else ()
    date_hierarchy = 'weather_datetime'
    ordering = ('-weather_datetime', 'area')
    
    list_per_page = 50
    
    fieldsets = (
        ('基本資訊', {
            'fields': (
                'source',
                'weather_datetime',
                'area',
                'city',
                'weather_id',
            )
        }),
        ('天氣數據', {
            'fields': (
                'temperature',
                'rainfall',
                'snowfall',
                'deepest_snow',
                'sunshine_hours',
            )
        }),
        ('風向與濕度', {
            'fields': (
                'wind_speed',
                'wind_direction',
                'relative_humidity',
            )
        }),
    )

@admin.register(WeatherForecast)
class WeatherForecastAdmin(admin.ModelAdmin):
    list_display = (
        'source',
        'get_datetime',
        'weather_datetime',
        'city',
        'area',
        'temperature',
        'rainfall',
        'wind_speed',
        'wind_direction',
        'clouds_all',
    )
    list_filter = (
        DateTimeFilter,
        'city',
        'area',
        'weather_id',
        'wind_direction',
    )
    search_fields = (
        'source',
        'city',
        'area__name',
        'area__name_jp',
        'area__name_ch',
    )
    readonly_fields = ('created_at',) if hasattr(WeatherForecast, 'created_at') else ()
    date_hierarchy = 'weather_datetime'
    ordering = ('-get_datetime', '-weather_datetime', 'area')
    
    list_per_page = 50
    
    fieldsets = (
        ('預測資訊', {
            'fields': (
                'source',
                'get_datetime',
                'weather_datetime',
                'area',
                'city',
                'weather_id',
            )
        }),
        ('天氣資料', {
            'fields': (
                'temperature',
                'rainfall',
                'snowfall',
                'clouds_all',
            )
        }),
        ('風向與濕度', {
            'fields': (
                'wind_speed',
                'wind_direction',
                'relative_humidity',
            )
        }),
    )

    def get_search_results(self, request, queryset, search_term):
        """增強搜尋功能"""
        queryset, use_distinct = super().get_search_results(request, queryset, search_term)
        
        try:
            # 嘗試將搜尋詞轉換為浮點數，用於搜尋溫度範圍
            search_float = float(search_term)
            temperature_query = Q(temperature__gte=search_float-0.5) & Q(temperature__lte=search_float+0.5)
            queryset |= self.model.objects.filter(temperature_query)
        except ValueError:
            pass
            
        return queryset, use_distinct

