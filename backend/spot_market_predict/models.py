from django.db import models
from django.core.validators import MinValueValidator
from area.models import Area

class QuickAreaPricePredict(models.Model):
    """QUICK區域價格預測資料"""
    trade_date = models.DateField(help_text="交易日期")
    time_code = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1)],
        help_text="時段代碼(1-48)"
    )
    area = models.ForeignKey(
        Area,
        on_delete=models.CASCADE,
        related_name='prices_predict', # Area反向關聯名稱
        help_text="電力區域"
    )

    calculating_date = models.DateField(
        help_text="預測計算日期",
    )

    price_5 = models.DecimalField(
        max_digits=10,
        decimal_places=2,
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
        help_text="P95區域預測價格"
    )

    class Meta:
        verbose_name = "QUICK區域現貨交易價格預測"
        verbose_name_plural = "QUICK區域現貨交易價格預測"
        # 確保每個現貨交易和區域的預測資料唯一
        unique_together = [
            'trade_date',
            'time_code',
            'area',
            'calculating_date'
        ]
        indexes = [
            models.Index(fields=['trade_date', 'time_code', 'area']),
        ]

    def __str__(self):
        return f"{self.trade_date} {self.area.name} {self.price_50}"
