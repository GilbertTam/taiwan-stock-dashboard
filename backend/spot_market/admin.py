from django.contrib import admin
from spot_market.models import SpotTrade, AreaPrice

@admin.register(SpotTrade)
class SpotTradeAdmin(admin.ModelAdmin):
    list_display = ('id', 'trade_date', 'time_code', 'sell_quantity', 'buy_quantity', 'contract_quantity', 'system_price')
    search_fields = ('trade_date', 'time_code')
    list_filter = ('trade_date', 'time_code')
    ordering = ('trade_date', 'time_code')
    date_hierarchy = 'trade_date'

@admin.register(AreaPrice)
class AreaPriceAdmin(admin.ModelAdmin):
    list_display = ('id', 'spot_trade', 'area', 'price', 'avoidable_cost')
    search_fields = ('spot_trade__trade_date', 'area__name')
    list_filter = ('spot_trade__trade_date', 'area__name')
    ordering = ('spot_trade__trade_date', 'area__name')
    date_hierarchy = 'spot_trade__trade_date'
    list_per_page = 48