from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import QuickPredictViewSet

router = DefaultRouter(trailing_slash=False)
router.register(r'quick-predict', QuickPredictViewSet, basename='quick-predict')

urlpatterns = [
    path('', include(router.urls)),
]
