from django.db import models
from django.core.validators import MinValueValidator
from area.models import Area

class SpotTrade(models.Model):
    """現貨市場交易資料"""
    trade_date = models.DateField(help_text="交易日期")
    time_code = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1)],
        help_text="時段代碼(1-48)"
    )
    sell_quantity = models.PositiveBigIntegerField(help_text="賣出量")
    buy_quantity = models.PositiveBigIntegerField(help_text="買入量")
    contract_quantity = models.PositiveBigIntegerField(help_text="成交量")
    system_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="系統價格"
    )

    class Meta:
        verbose_name = "區域現貨市場量價"
        verbose_name_plural = "區域現貨市場量價"
        # 確保每個日期和時段只有一筆資料
        unique_together = ['trade_date', 'time_code']
        indexes = [
            models.Index(fields=['trade_date', 'time_code']),
        ]
        db_table = 'spot_trade'

    def __str__(self):
        return f"{self.trade_date} 時段{self.time_code}"

class AreaPrice(models.Model):
    """區域價格資料"""
    spot_trade = models.ForeignKey(
        SpotTrade,
        on_delete=models.CASCADE,
        related_name='area_prices', # SpotTrade反向關聯名稱
        help_text="關聯的現貨交易"
    )
    area = models.ForeignKey(
        Area,
        on_delete=models.CASCADE,
        related_name='prices', # Area反向關聯名稱
        help_text="電力區域"
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="區域價格"
    )
    avoidable_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="可避免成本"
    )

    class Meta:
        verbose_name = "區域現貨交易價格"
        verbose_name_plural = "區域現貨交易價格"
        # 確保每個交易時段的每個區域只有一筆價格資料
        unique_together = ['spot_trade', 'area']
        indexes = [
            models.Index(fields=['spot_trade', 'area']),
        ]
        db_table = 'area_price'

    def __str__(self):
        return f"{self.spot_trade} {self.area.name} {self.price}"
