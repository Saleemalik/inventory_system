from itertools import product as cartesian_product
from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import serializers

from .models import (
    Products,
    ProductVariant,
    VariantOption,
    SubVariant,
    StockTransaction,
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username']
        


class VariantOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = VariantOption
        fields = ["id", "value"]


class ProductVariantSerializer(serializers.ModelSerializer):
    options = VariantOptionSerializer(many=True)

    class Meta:
        model = ProductVariant
        fields = ["id", "name", "options"]


class SubVariantSerializer(serializers.ModelSerializer):

    option_values = serializers.SerializerMethodField()

    class Meta:
        model = SubVariant
        fields = ["id", "sku", "stock", "combination_key", "option_values"]

    def get_option_values(self, obj):
        return list(obj.options.values_list("value", flat=True))


class ProductSerializer(serializers.ModelSerializer):

    variants = ProductVariantSerializer(many=True, write_only=True, required=False)
    subvariants = SubVariantSerializer(many=True, read_only=True)

    class Meta:
        model = Products
        fields = "__all__"
        read_only_fields = ("id", "CreatedDate", "UpdatedDate", "TotalStock", "CreatedUser")

    def validate_variants(self, variants):

        if variants is None:
            return variants

        variant_names = set()

        for variant in variants:
            name = variant.get("name", "").strip()
            if not name:
                raise serializers.ValidationError("Variant name is required.")

            if name.lower() in variant_names:
                raise serializers.ValidationError(f"Duplicate variant name: {name}")
            variant_names.add(name.lower())

            options = variant.get("options", [])
            if not options:
                raise serializers.ValidationError(f"{name} must contain at least one option.")

            option_values = []
            for option in options:
                value = option.get("value", "").strip()
                if not value:
                    raise serializers.ValidationError(f"Empty option found in {name}")
                option_values.append(value.lower())

            if len(option_values) != len(set(option_values)):
                raise serializers.ValidationError(f"Duplicate options found in {name}")

        return variants

    def validate(self, attrs):
        if self.instance is None and not attrs.get("variants"):
            raise serializers.ValidationError(
                {"variants": "At least one variant is required."}
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):

        variants_data = validated_data.pop("variants", [])
        request = self.context["request"]

        product_obj = Products.objects.create(**validated_data, CreatedUser=request.user)

        option_groups = []

        for variant_data in variants_data:
            options_data = variant_data.pop("options", [])
            variant_obj = ProductVariant.objects.create(product=product_obj, **variant_data)

            created_options = []
            for option_data in options_data:
                option_obj = VariantOption.objects.create(
                    variant=variant_obj, value=option_data["value"].strip()
                )
                created_options.append(option_obj)

            option_groups.append(created_options)

        self._generate_subvariants(product_obj, option_groups)
        return product_obj

    def update(self, instance, validated_data):
        
        validated_data.pop("variants", None)

        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance

    def _generate_subvariants(self, product_obj, option_groups):

        if not option_groups:
            return

        combinations = cartesian_product(*option_groups)

        for combination in combinations:
            option_ids = sorted(str(option.id) for option in combination)
            combination_key = "|".join(option_ids)

            option_values = [
                option.value.upper().replace(" ", "-") for option in combination
            ]
            sku = f"{product_obj.ProductCode}-" + "-".join(option_values)

            subvariant = SubVariant.objects.create(
                product=product_obj,
                sku=sku,
                combination_key=combination_key,
                stock=0,
            )
            subvariant.options.set(combination)


class ProductVariantCreateSerializer(serializers.ModelSerializer):
    """Used for POST /api/products/{id}/variants/ (add a new variant)."""

    options = serializers.ListField(
        child=serializers.CharField(), allow_empty=False
    )

    class Meta:
        model = ProductVariant
        fields = ["id", "name", "options"]

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Variant name is required.")
        return value.strip()

    def validate_options(self, options):
        cleaned = [opt.strip() for opt in options if opt.strip()]
        if not cleaned:
            raise serializers.ValidationError("At least one option is required.")
        if len(cleaned) != len(set(o.lower() for o in cleaned)):
            raise serializers.ValidationError("Duplicate options are not allowed.")
        return cleaned


class ProductVariantUpdateSerializer(serializers.Serializer):
    """Used for PUT /api/variants/{id}/ — validates name + options on update."""

    name = serializers.CharField(max_length=100)
    options = serializers.ListField(
        child=serializers.CharField(), allow_empty=False
    )

    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Variant name is required.")
        return value.strip()

    def validate_options(self, options):
        cleaned = [opt.strip() for opt in options if opt.strip()]
        if not cleaned:
            raise serializers.ValidationError("At least one option is required.")
        if len(cleaned) != len(set(o.lower() for o in cleaned)):
            raise serializers.ValidationError("Duplicate options are not allowed.")
        return cleaned


class PurchaseSerializer(serializers.Serializer):
    subvariant_id = serializers.IntegerField()
    quantity = serializers.DecimalField(max_digits=20, decimal_places=8)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than zero.")
        return value


class SaleSerializer(serializers.Serializer):
    subvariant_id = serializers.IntegerField()
    quantity = serializers.DecimalField(max_digits=20, decimal_places=8)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than zero.")
        return value


class StockSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.ProductName", read_only=True)

    class Meta:
        model = SubVariant
        fields = ["id", "sku", "stock", "product_name"]


class StockTransactionSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.ProductName", read_only=True)
    sku = serializers.CharField(source="subvariant.sku", read_only=True)
    running_balance = serializers.SerializerMethodField()

    class Meta:
        model = StockTransaction
        fields = [
            "id", "product_name", "sku", "transaction_type",
            "quantity", "notes", "created_at", "running_balance",
        ]

    def get_running_balance(self, obj):
        # attached dynamically by attach_running_balances() in the view;
        # falls back to None if not computed (e.g. used outside the report view)
        return getattr(obj, "running_balance", None)


class StockReportFilterSerializer(serializers.Serializer):
    """Validates query params for GET /api/stock/report/ so bad input -> 400, not 500."""

    product_id = serializers.UUIDField(required=False)
    transaction_type = serializers.ChoiceField(
        choices=[StockTransaction.PURCHASE, StockTransaction.SALE], required=False
    )
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)