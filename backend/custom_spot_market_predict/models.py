from django.db import models
from django.core.validators import MinValueValidator
from area.models import Area

class PredictionModel(models.Model):
    """預測模型定義"""
    name = models.CharField(max_length=100, help_text="模型名稱")
    version = models.CharField(max_length=50, help_text="模型版本")
    description = models.TextField(blank=True, null=True, help_text="模型描述")
    created_at = models.DateTimeField(auto_now_add=True, help_text="創建時間")
    updated_at = models.DateTimeField(auto_now=True, help_text="更新時間")
    
    class Meta:
        verbose_name = "預測模型"
        verbose_name_plural = "預測模型"
        unique_together = ['name', 'version']
        db_table = 'prediction_model'

    def __str__(self):
        return f"{self.name} v{self.version}"

class CustomAreaPricePredict(models.Model):
    """自定義區域價格預測資料"""
    model = models.ForeignKey(
        PredictionModel,
        on_delete=models.CASCADE,
        related_name='predictions',
        help_text="預測模型"
    )
    trade_date = models.DateField(help_text="交易日期")
    time_code = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1)],
        help_text="時段代碼(1-48)"
    )
    area = models.ForeignKey(
        Area,
        on_delete=models.CASCADE,
        related_name='custom_price_predictions',
        help_text="電力區域"
    )
    calculating_date = models.DateField(
        help_text="預測計算日期",
    )
    price_5 = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="P5區域預測價格"
    )
    price_50 = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="P50區域預測價格"
    )
    price_95 = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="P95區域預測價格"
    )
    # 可以添加其他預測值，例如 P25、P75 等
    additional_data = models.JSONField(
        null=True,
        blank=True,
        help_text="額外的預測數據 (JSON 格式)"
    )

    class Meta:
        verbose_name = "自定義區域價格預測"
        verbose_name_plural = "自定義區域價格預測"
        # 確保每個模型、交易日期、時段、區域和計算日期的預測資料唯一
        unique_together = [
            'model',
            'trade_date',
            'time_code',
            'area',
            'calculating_date'
        ]
        indexes = [
            models.Index(fields=['model', 'trade_date', 'time_code', 'area']),
            models.Index(fields=['calculating_date']),
        ]
        db_table = 'custom_area_price_predict'

    def __str__(self):
        return f"{self.model.name} v{self.model.version} - {self.trade_date} {self.area.name} {self.price_50}"
