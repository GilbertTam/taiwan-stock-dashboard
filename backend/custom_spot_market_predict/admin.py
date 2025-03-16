from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Q
import json
from django.utils.safestring import mark_safe

from custom_spot_market_predict.models import PredictionModel, CustomAreaPricePredict

@admin.register(PredictionModel)
class PredictionModelAdmin(admin.ModelAdmin):
    list_display = ('name', 'version', 'description_short', 'created_at', 'updated_at', 'prediction_count')
    list_filter = ('name',)
    search_fields = ('name', 'version', 'description')
    readonly_fields = ('created_at', 'updated_at')
    list_per_page = 20  # 每頁顯示20條記錄
    
    def description_short(self, obj):
        """顯示簡短的描述"""
        if obj.description and len(obj.description) > 50:
            return f"{obj.description[:50]}..."
        return obj.description
    description_short.short_description = "描述"
    
    def prediction_count(self, obj):
        """顯示該模型的預測數量"""
        return obj.predictions.count()
    prediction_count.short_description = "預測數量"

    def get_queryset(self, request):
        """優化查詢，預先獲取關聯的預測數量"""
        queryset = super().get_queryset(request)
        return queryset.prefetch_related('predictions')

@admin.register(CustomAreaPricePredict)
class CustomAreaPricePredictAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'model_display', 'trade_date', 'time_code', 
        'area_display', 'calculating_date', 
        'price_5', 'price_50', 'price_95', 'additional_data_display'
    )
    list_filter = (
        'calculating_date', 'trade_date', 
        ('model__name', admin.AllValuesFieldListFilter),
        ('model__version', admin.AllValuesFieldListFilter),
        ('area__name', admin.AllValuesFieldListFilter)
    )
    search_fields = ('trade_date', 'area__name', 'model__name')
    readonly_fields = ('formatted_additional_data',)
    date_hierarchy = 'trade_date'  # 添加日期層次導航
    list_per_page = 25  # 每頁顯示25條記錄
    
    fieldsets = (
        ('基本信息', {
            'fields': (
                'model', 'trade_date', 'time_code', 
                'area', 'calculating_date'
            )
        }),
        ('預測價格', {
            'fields': ('price_5', 'price_50', 'price_95')
        }),
        ('額外數據', {
            'fields': ('additional_data', 'formatted_additional_data'),
            'classes': ('collapse',),  # 可折疊
        }),
    )
    
    def model_display(self, obj):
        """顯示模型名稱和版本"""
        return f"{obj.model.name} v{obj.model.version}"
    model_display.short_description = "預測模型"
    model_display.admin_order_field = 'model__name'
    
    def area_display(self, obj):
        """顯示區域名稱"""
        return f"{obj.area.name}"
    area_display.short_description = "電力區域"
    area_display.admin_order_field = 'area__name'
    
    def additional_data_display(self, obj):
        """顯示額外數據的簡短摘要"""
        if not obj.additional_data:
            return "-"
        
        # 嘗試獲取字典的鍵數量或列表的長度
        try:
            if isinstance(obj.additional_data, dict):
                return f"{len(obj.additional_data)}個項目"
            elif isinstance(obj.additional_data, list):
                return f"{len(obj.additional_data)}個元素"
            else:
                return "有數據"
        except:
            return "有數據"
    additional_data_display.short_description = "額外數據"
    
    def formatted_additional_data(self, obj):
        """格式化顯示JSON數據"""
        if not obj.additional_data:
            return "-"
        
        # 將JSON數據格式化為美觀的HTML
        try:
            formatted_json = json.dumps(obj.additional_data, indent=4, ensure_ascii=False)
            return mark_safe(f'<pre>{formatted_json}</pre>')
        except:
            return str(obj.additional_data)
    formatted_additional_data.short_description = "格式化額外數據"
    
    def get_queryset(self, request):
        """優化查詢，預先獲取關聯的模型和區域"""
        queryset = super().get_queryset(request)
        return queryset.select_related('model', 'area')
    
    def get_search_results(self, request, queryset, search_term):
        """增強搜索功能"""
        queryset, use_distinct = super().get_search_results(request, queryset, search_term)
        
        # 如果搜索詞是數字，也搜索價格範圍
        if search_term.replace('.', '', 1).isdigit():
            price = float(search_term)
            price_query = (
                Q(price_5__lte=price, price_95__gte=price) |  # 價格在P5和P95之間
                Q(price_50=price)  # 價格等於P50
            )
            queryset |= self.model.objects.filter(price_query)
        
        return queryset, use_distinct
    
    # 自定義批量操作
    actions = ['export_selected_predictions']
    
    def export_selected_predictions(self, request, queryset):
        """匯出選定的預測數據"""
        # 這裡可以實現匯出功能，例如生成CSV文件
        # 為了簡單起見，我們只顯示一個消息
        self.message_user(request, f"已選擇 {queryset.count()} 條預測數據進行匯出")
    export_selected_predictions.short_description = "匯出選定的預測數據"
