from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView

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
    SubVariantSerializer,
    PurchaseSerializer,
    SaleSerializer,
    StockSerializer,
    StockTransactionSerializer,
)

from .services import (regenerate_subvariants,
                       purchase_stock,
                       sale_stock)
# Create your views here.
class ProductViewSet(viewsets.ModelViewSet):

    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

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
        

    def destroy(self, request, *args, **kwargs):

        product = self.get_object()
        product.Active = False
        product.save(update_fields=["Active"])

        return Response(
            {"detail": "Product deactivated"},
            status=status.HTTP_200_OK
        )
        
    @action( detail=True,
    methods=["post"],
    url_path="variants"
    )
    @transaction.atomic
    def add_variant(self, request, pk=None):

        product = self.get_object()

        serializer = ProductVariantCreateSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        variant = ProductVariant.objects.create(
            product=product,
            name=serializer.validated_data["name"]
        )

        options = serializer.validated_data["options"]

        for value in options:

            VariantOption.objects.create(
                variant=variant,
                value=value
            )

        regenerate_subvariants(product)

        return Response(
            ProductVariantSerializer(variant).data,
            status=status.HTTP_201_CREATED
        )
        
    @action(
    detail=True,
    methods=["get"],
    url_path="variants"
    )
    def variants(self, request, pk=None):
        product = self.get_object()

        queryset = product.variants.prefetch_related("options")

        serializer = ProductVariantSerializer(
            queryset,
            many=True
        )

        return Response(serializer.data)
        
    @action(
        detail=True,
        methods=["get"],
        url_path="subvariants"
    )
    def subvariants(self, request, pk=None):

        product = self.get_object()

        queryset = (
            SubVariant.objects
            .filter(product=product)
            .prefetch_related("options")
        )

        serializer = SubVariantSerializer(
            queryset,
            many=True
        )

        return Response(serializer.data)
            

class ProductVariantViewSet(viewsets.ModelViewSet):

        queryset = (ProductVariant.objects
            .all()
            .prefetch_related("options")
        )

        serializer_class = ProductVariantSerializer
        
        @transaction.atomic
        def update(self, request, *args, **kwargs):

            variant = self.get_object()

            name = request.data.get("name")

            options = request.data.get(
                "options",
                []
            )

            variant.name = name
            variant.save()

            variant.options.all().delete()

            for value in options:

                VariantOption.objects.create(
                    variant=variant,
                    value=value
                )

            regenerate_subvariants(
                variant.product
            )

            return Response(
                ProductVariantSerializer(
                    variant
                ).data
            )
            
        @transaction.atomic
        def destroy(self, request, *args, **kwargs):

            variant = self.get_object()

            product = variant.product

            variant.delete()

            regenerate_subvariants(product)

            return Response(
                {
                    "detail":
                    "Variant deleted successfully"
                }
            )
            
class PurchaseStockAPIView(APIView):

    def post(self, request):

        serializer = PurchaseSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        subvariant = SubVariant.objects.get(
            pk=serializer.validated_data[
                "subvariant_id"
            ]
        )

        purchase_stock(
            subvariant=subvariant,
            quantity=serializer.validated_data[
                "quantity"
            ],
            notes=serializer.validated_data.get(
                "notes"
            ),
        )

        return Response(
            {
                "detail":
                "Stock added successfully"
            },
            status=status.HTTP_201_CREATED,
        )
        
class SaleStockAPIView(APIView):

    def post(self, request):

        serializer = SaleSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        subvariant = SubVariant.objects.get(
            pk=serializer.validated_data[
                "subvariant_id"
            ]
        )

        try:

            sale_stock(
                subvariant=subvariant,
                quantity=serializer.validated_data[
                    "quantity"
                ],
                notes=serializer.validated_data.get(
                    "notes"
                ),
            )

        except ValueError as exc:

            return Response(
                {
                    "detail": str(exc)
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "detail":
                "Stock removed successfully"
            }
        )

class StockAPIView(APIView):

    def get(self, request):

        queryset = (
            SubVariant.objects
            .select_related("product")
            .all()
        )

        serializer = StockSerializer(
            queryset,
            many=True,
        )

        return Response(serializer.data)
    

class StockReportAPIView(APIView):

    def get(self, request):

        queryset = (
            StockTransaction.objects
            .select_related(
                "product",
                "subvariant",
            )
            .all()
        )

        product_id = request.GET.get(
            "product_id"
        )

        transaction_type = request.GET.get(
            "transaction_type"
        )

        start_date = request.GET.get(
            "start_date"
        )

        end_date = request.GET.get(
            "end_date"
        )

        if product_id:
            queryset = queryset.filter(
                product_id=product_id
            )

        if transaction_type:
            queryset = queryset.filter(
                transaction_type=transaction_type
            )

        if start_date:
            queryset = queryset.filter(
                created_at__date__gte=start_date
            )

        if end_date:
            queryset = queryset.filter(
                created_at__date__lte=end_date
            )

        serializer = (
            StockTransactionSerializer(
                queryset,
                many=True,
            )
        )

        return Response(
            serializer.data
        )
