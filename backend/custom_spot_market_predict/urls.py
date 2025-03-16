from django.urls import path, include
from rest_framework.routers import DefaultRouter
from custom_spot_market_predict.views import PredictionModelViewSet, CustomPredictViewSet

router = DefaultRouter(trailing_slash=False)
router.register(r'prediction-models', PredictionModelViewSet, basename='prediction-models')
router.register(r'custom-predict', CustomPredictViewSet, basename='custom-predict')

urlpatterns = [
    path('', include(router.urls)),
]
