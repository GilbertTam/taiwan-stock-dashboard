from django.urls import path, include
from rest_framework.routers import DefaultRouter
from spot_market.views import SpotMarketViewSet

router = DefaultRouter(trailing_slash=False)
router.register(r'spot-market', SpotMarketViewSet, basename='spot-market')

urlpatterns = [
    path('', include(router.urls)),
]
