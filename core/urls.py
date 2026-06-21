from django.contrib import admin
from django.urls import path
from rest_framework import routers
from core.views import ProductViewSet, ProductVariantViewSet, StockReportAPIView, PurchaseStockAPIView, SaleStockAPIView, StockAPIView


router = routers.DefaultRouter()
router.register("products", ProductViewSet, basename="products")
router.register(
    "variants",
    ProductVariantViewSet,
    basename="variants"
)


urlpatterns = [
    path(
        "stock/purchase/",
        PurchaseStockAPIView.as_view(),
    ),

    path(
        "stock/sale/",
        SaleStockAPIView.as_view(),
    ),

    path(
        "stock/",
        StockAPIView.as_view(),
    ),

    path(
        "stock/report/",
        StockReportAPIView.as_view(),
    ),
    
] + router.urls
