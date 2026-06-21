import logging

from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.exceptions import NotFound

from django.db import transaction

from .models import (
    Products,
    ProductVariant,
    VariantOption,
    SubVariant,
    StockTransaction,
)

from .serializers import (
    ProductSerializer,
    ProductVariantSerializer,
    ProductVariantCreateSerializer,
    ProductVariantUpdateSerializer,
    SubVariantSerializer,
    PurchaseSerializer,
    SaleSerializer,
    StockSerializer,
    StockTransactionSerializer,
    StockReportFilterSerializer,
)

from .services import regenerate_subvariants, sync_product_stock, purchase_stock, sale_stock

logger = logging.getLogger("core")


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class ProductViewSet(viewsets.ModelViewSet):

    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        return (
            Products.objects
            .filter(Active=True)
            .select_related("CreatedUser")
            .prefetch_related(
                "variants",
                "variants__options",
                "subvariants",
                "subvariants__options",
            )
        )

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        logger.info("Product created: %s by user=%s", request.data.get("ProductCode"), request.user)
        return response

    def destroy(self, request, *args, **kwargs):
        product = self.get_object()
        product.Active = False
        product.save(update_fields=["Active"])
        logger.info("Product deactivated: %s by user=%s", product.ProductCode, request.user)
        return Response({"detail": "Product deactivated"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get", "post"], url_path="variants")
    def variants(self, request, pk=None):

        product = self.get_object()

        if request.method == "GET":
            queryset = ProductVariant.objects.filter(product=product).prefetch_related("options")
            serializer = ProductVariantSerializer(queryset, many=True)
            return Response(serializer.data)

        # POST -> add a new variant
        return self._add_variant(request, product)

    @transaction.atomic
    def _add_variant(self, request, product):

        serializer = ProductVariantCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # prevent duplicate variant name on this product (app-level check)
        name = serializer.validated_data["name"]
        if ProductVariant.objects.filter(product=product, name__iexact=name).exists():
            return Response(
                {"detail": f"Variant '{name}' already exists for this product."},
                status=status.HTTP_409_CONFLICT,
            )

        variant = ProductVariant.objects.create(product=product, name=name)

        for value in serializer.validated_data["options"]:
            VariantOption.objects.create(variant=variant, value=value)

        regenerate_subvariants(product)

        logger.info("Variant '%s' added to product=%s", name, product.ProductCode)

        return Response(
            ProductVariantSerializer(variant).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"], url_path="subvariants")
    def subvariants(self, request, pk=None):

        product = self.get_object()

        queryset = (
            SubVariant.objects
            .filter(product=product)
            .prefetch_related("options")
        )

        page = self.paginate_queryset(queryset)
        serializer = SubVariantSerializer(page if page is not None else queryset, many=True)

        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)


class ProductVariantViewSet(viewsets.ModelViewSet):

    queryset = ProductVariant.objects.all().prefetch_related("options")
    serializer_class = ProductVariantSerializer
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def update(self, request, *args, **kwargs):

        variant = self.get_object()

        serializer = ProductVariantUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        variant.name = serializer.validated_data["name"]
        variant.save(update_fields=["name"])

        variant.options.all().delete()
        for value in serializer.validated_data["options"]:
            VariantOption.objects.create(variant=variant, value=value)

        regenerate_subvariants(variant.product)

        logger.info("Variant id=%s updated on product=%s", variant.id, variant.product.ProductCode)

        return Response(ProductVariantSerializer(variant).data)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):

        variant = self.get_object()
        product = variant.product
        variant_name = variant.name

        # Any sub-variant that uses one of this variant's options becomes
        # invalid once the variant is removed (incomplete combination), so
        # delete those sub-variants explicitly. M2M on_delete=CASCADE only
        # removes the join rows, not the SubVariant itself.
        option_ids = list(variant.options.values_list("id", flat=True))
        affected_ids = list(
            SubVariant.objects
            .filter(product=product, options__id__in=option_ids)
            .values_list("id", flat=True)
            .distinct()
        )
        SubVariant.objects.filter(id__in=affected_ids).delete()

        variant.delete()  # cascades to its VariantOptions
        regenerate_subvariants(product)  # rebuild any remaining valid combinations
        sync_product_stock(product)

        logger.info("Variant '%s' deleted from product=%s", variant_name, product.ProductCode)

        return Response({"detail": "Variant deleted successfully"})


class PurchaseStockAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = PurchaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            subvariant = purchase_stock(
                subvariant_id=serializer.validated_data["subvariant_id"],
                quantity=serializer.validated_data["quantity"],
                notes=serializer.validated_data.get("notes"),
            )
        except SubVariant.DoesNotExist:
            return Response({"detail": "Sub-variant not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response(
            {"detail": "Stock added successfully", "stock": subvariant.stock},
            status=status.HTTP_201_CREATED,
        )


class SaleStockAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = SaleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            subvariant = sale_stock(
                subvariant_id=serializer.validated_data["subvariant_id"],
                quantity=serializer.validated_data["quantity"],
                notes=serializer.validated_data.get("notes"),
            )
        except SubVariant.DoesNotExist:
            return Response({"detail": "Sub-variant not found."}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"detail": "Stock removed successfully", "stock": subvariant.stock})


class StockAPIView(APIView):

    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    def get(self, request):

        queryset = SubVariant.objects.select_related("product").all()

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)

        serializer = StockSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class StockReportAPIView(APIView):

    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    def get(self, request):

        filters = StockReportFilterSerializer(data=request.query_params)
        filters.is_valid(raise_exception=True)
        data = filters.validated_data

        queryset = (
            StockTransaction.objects
            .select_related("product", "subvariant")
            .all()
        )

        if data.get("product_id"):
            queryset = queryset.filter(product_id=data["product_id"])

        if data.get("transaction_type"):
            queryset = queryset.filter(transaction_type=data["transaction_type"])

        if data.get("start_date"):
            queryset = queryset.filter(created_at__date__gte=data["start_date"])

        if data.get("end_date"):
            queryset = queryset.filter(created_at__date__lte=data["end_date"])

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)

        serializer = StockTransactionSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)