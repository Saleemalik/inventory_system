from itertools import product as cartesian_product
from django.db import transaction
from django.db.models import Sum

from .models import (
    Products,
    SubVariant,
    StockTransaction,
    ProductVariant,
    SubVariant,
    VariantOption,
)


def regenerate_subvariants(product):

    SubVariant.objects.filter(
        product=product
    ).delete()

    option_groups = []

    variants = (
        ProductVariant.objects
        .filter(product=product)
        .prefetch_related("options")
    )

    for variant in variants:

        options = list(
            variant.options.all()
        )

        if options:
            option_groups.append(options)

    if not option_groups:
        return

    combinations = cartesian_product(
        *option_groups
    )

    for combination in combinations:

        option_ids = sorted(
            str(option.id)
            for option in combination
        )

        combination_key = "|".join(option_ids)

        sku = (
            f"{product.ProductCode}-"
            + "-".join(
                option.value.upper()
                for option in combination
            )
        )

        subvariant = SubVariant.objects.create(
            product=product,
            sku=sku,
            combination_key=combination_key,
        )

        subvariant.options.set(combination)
        
        

def sync_product_stock(product):

    total_stock = (
        SubVariant.objects
        .filter(product=product)
        .aggregate(
            total=Sum("stock")
        )["total"]
        or 0
    )

    product.TotalStock = total_stock
    product.save(
        update_fields=["TotalStock"]
    )
    
@transaction.atomic
def purchase_stock(
    subvariant,
    quantity,
    notes=None,
):

    subvariant.stock += quantity

    subvariant.save(
        update_fields=["stock"]
    )

    StockTransaction.objects.create(
        product=subvariant.product,
        subvariant=subvariant,
        transaction_type=StockTransaction.PURCHASE,
        quantity=quantity,
        notes=notes,
    )

    sync_product_stock(
        subvariant.product
    )
    
@transaction.atomic
def sale_stock(
    subvariant,
    quantity,
    notes=None,
):

    if subvariant.stock < quantity:
        raise ValueError(
            "Insufficient stock."
        )

    subvariant.stock -= quantity

    subvariant.save(
        update_fields=["stock"]
    )

    StockTransaction.objects.create(
        product=subvariant.product,
        subvariant=subvariant,
        transaction_type=StockTransaction.SALE,
        quantity=quantity,
        notes=notes,
    )

    sync_product_stock(
        subvariant.product
    )