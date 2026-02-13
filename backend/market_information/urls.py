from django.urls import path, include
from rest_framework.routers import DefaultRouter
from market_information.views import MarketInformationViewSet

router = DefaultRouter(trailing_slash=False)
router.register(r'market-info', MarketInformationViewSet, basename='market-info')

from .optimization_views import RevenueOptimizationView

urlpatterns = [
    path('', include(router.urls)),
    path('market-info/analyze/revenue', RevenueOptimizationView.as_view(), name='revenue-analyze'),
]
