from django.contrib import admin

# Register your models here.
from .models import (
    Products,
    ProductVariant,
    VariantOption,
    SubVariant,
    StockTransaction,
)

@admin.register(Products)
class ProductsAdmin(admin.ModelAdmin):   
    list_display = ("ProductName", "ProductCode", "Active", "CreatedUser", "CreatedDate")
    search_fields = ("ProductName", "ProductCode")
    list_filter = ("Active", "CreatedUser")

@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ("product", "name")
    list_filter = ("product",)

@admin.register(VariantOption)
class VariantOptionAdmin(admin.ModelAdmin):
    list_display = ("variant", "value")
    search_fields = ("value",)
    list_filter = ("variant",)

@admin.register(SubVariant)
class SubVariantAdmin(admin.ModelAdmin):
    list_display = ("product", "sku", "stock", "active")
    search_fields = ("product",)
    list_filter = ("product",)

@admin.register(StockTransaction)
class StockTransactionAdmin(admin.ModelAdmin):
    list_display = ("product", "transaction_type", "quantity", "created_at")
    search_fields = ("product",)
    list_filter = ("transaction_type", "created_at")

admin.site.site_header = "Inventory Management Admin"
admin.site.site_title = "Inventory Management Admin Portal"
admin.site.index_title = "Welcome to Inventory Management Admin Portal"