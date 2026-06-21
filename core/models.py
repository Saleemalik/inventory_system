import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from versatileimagefield.fields import VersatileImageField

# Create your models here.



class Products(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ProductID = models.BigIntegerField(unique=True)
    ProductCode = models.CharField(max_length=255, unique=True)
    ProductName = models.CharField(max_length=255)
    ProductImage = VersatileImageField(upload_to="uploads/", blank=True, null=True)
    CreatedDate = models.DateTimeField(auto_now_add=True)
    UpdatedDate = models.DateTimeField(blank=True, null=True)
    CreatedUser = models.ForeignKey(
        "auth.User", related_name="user%(class)s_objects", on_delete=models.CASCADE
    )
    IsFavourite = models.BooleanField(default=False)
    Active = models.BooleanField(default=True)
    HSNCode = models.CharField(max_length=255, blank=True, null=True)
    TotalStock = models.DecimalField(
        default=0.00, max_digits=20, decimal_places=8, blank=True, null=True
    )

    class Meta:
        db_table = "products_product"
        verbose_name = _("product")
        verbose_name_plural = _("products")
        unique_together = (("ProductCode", "ProductID"),)
        ordering = ("-CreatedDate", "ProductID")


class ProductVariant(models.Model):
    product = models.ForeignKey(
        Products, related_name="variants", on_delete=models.CASCADE, db_index=True
    )
    name = models.CharField(max_length=100)  # Size, Color
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "product_variant"
        unique_together = ("product", "name")
        indexes = [
            models.Index(fields=["product"]),
        ]

    def __str__(self):
        return f"{self.product.ProductName} - {self.name}"


class VariantOption(models.Model):
    variant = models.ForeignKey(
        ProductVariant, related_name="options", on_delete=models.CASCADE, db_index=True
    )
    value = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "variant_option"
        unique_together = ("variant", "value")
        indexes = [
            models.Index(fields=["variant"]),
        ]

    def __str__(self):
        return self.value


class SubVariant(models.Model):
    product = models.ForeignKey(
        Products, related_name="subvariants", on_delete=models.CASCADE, db_index=True
    )
    sku = models.CharField(max_length=255, unique=True)
    combination_key = models.CharField(max_length=500, db_index=True)
    options = models.ManyToManyField(VariantOption, related_name="subvariants")
    stock = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "product_subvariant"
        unique_together = ("product", "combination_key")
        constraints = [
        models.CheckConstraint(condition=models.Q(stock__gte=0), name="subvariant_stock_gte_0")
    ]
        indexes = [
            models.Index(fields=["product"]),
            models.Index(fields=["combination_key"]),
        ]

    def __str__(self):
        return self.sku


class StockTransaction(models.Model):

    PURCHASE = "PURCHASE"
    SALE = "SALE"

    TRANSACTION_TYPES = (
        (PURCHASE, "Purchase"),
        (SALE, "Sale"),
    )

    product = models.ForeignKey(
        Products, related_name="stock_transactions", on_delete=models.CASCADE
    )
    subvariant = models.ForeignKey(
        SubVariant, related_name="stock_transactions", on_delete=models.CASCADE
    )
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    quantity = models.DecimalField(max_digits=20, decimal_places=8)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "stock_transaction"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["product"]),
            models.Index(fields=["subvariant"]),
            models.Index(fields=["transaction_type"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.transaction_type} - {self.quantity}"
