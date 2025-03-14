from django.db import models

class Area(models.Model):
    """電力區域"""
    name = models.CharField(max_length=50, unique=True, help_text="區域名稱")
    name_ch = models.CharField(max_length=50, unique=True, help_text="區域名稱(中文)")
    name_jp = models.CharField(max_length=50, unique=True, help_text="區域名稱(日文)")

    class Meta:
        verbose_name = "電力區域"
        verbose_name_plural = "電力區域"
        ordering = ['name']
        db_table = 'area'

    def __str__(self):
        return self.name
