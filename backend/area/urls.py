from django.urls import path
from area.views import AreaListView

urlpatterns = [
    path('area', AreaListView.as_view(), name='area-list'),
]
