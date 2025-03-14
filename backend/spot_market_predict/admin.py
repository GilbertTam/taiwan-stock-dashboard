from django.contrib import admin
from spot_market_predict.models import QuickAreaPricePredict

@admin.register(QuickAreaPricePredict)
class QuickAreaPricePredictAdmin(admin.ModelAdmin):
    list_display = ('id', 'calculating_date', 'trade_date', 'time_code', 'area', 'price_5', 'price_50', 'price_95')
    search_fields = ('trade_date', 'area__name')
    list_filter = ('trade_date', 'area__name')
    ordering = ('calculating_date', 'trade_date', 'area__name')
    date_hierarchy = 'trade_date'
    list_per_page = 48