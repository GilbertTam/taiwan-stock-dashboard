from django.urls import path, include
from rest_framework.routers import DefaultRouter
from market_information.views import MarketInformationViewSet

router = DefaultRouter()
router.register(r'', MarketInformationViewSet, basename='market-info')

urlpatterns = [
    path('', include(router.urls)),
]
