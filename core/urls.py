from django.urls import path
from rest_framework import routers

from core.views import (
    ProductViewSet,
    ProductVariantViewSet,
    StockReportAPIView,
    PurchaseStockAPIView,
    SaleStockAPIView,
    StockAPIView,
)

router = routers.DefaultRouter()
router.register("products", ProductViewSet, basename="products")

urlpatterns = [
    path(
        "variants/<int:pk>/",
        ProductVariantViewSet.as_view({"put": "update", "delete": "destroy"}),
        name="variant-detail",
    ),

    path("stock/purchase/", PurchaseStockAPIView.as_view()),
    path("stock/sale/", SaleStockAPIView.as_view()),
    path("stock/report/", StockReportAPIView.as_view()),  # must come before stock/
    path("stock/", StockAPIView.as_view()),

] + router.urls