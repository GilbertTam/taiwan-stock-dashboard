from django.urls import path, include
from rest_framework.routers import DefaultRouter
from market_information.views import MarketInformationViewSet

router = DefaultRouter(trailing_slash=False)
router.register(r'market-info', MarketInformationViewSet, basename='market-info')

urlpatterns = [
    path('', include(router.urls)),
]
