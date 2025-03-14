from django.contrib import admin
from django.contrib.admin import ModelAdmin

from area.models import Area


@admin.register(Area)
class AreaAdmin(ModelAdmin):
    list_display = ('id', 'name', 'name_ch', 'name_jp')
    search_fields = ('name', 'name_ch', 'name_jp')
