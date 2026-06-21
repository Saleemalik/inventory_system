import logging
from itertools import product as cartesian_product

from django.db import transaction
from django.db.models import Sum

from .models import (
    SubVariant,
    StockTransaction,
    ProductVariant,
)

logger = logging.getLogger("core")


def attach_running_balances(filtered_transactions):
    """
    Given an iterable of StockTransaction rows (already filtered by the
    caller's date/product/type filters, but NOT yet paginated), compute
    each row's running balance for its sub-variant and attach it as
    `.running_balance`.

    Balance must reflect the FULL history of each sub-variant up to that
    transaction's timestamp -- not just the filtered window -- otherwise
    a date-range filter would show a wrong/reset balance. So for every
    sub-variant touched by the filtered rows, we pull its complete
    transaction history in chronological order, build a balance map keyed
    by transaction id, then annotate the filtered rows from that map.
    """

    filtered_transactions = list(filtered_transactions)
    if not filtered_transactions:
        return filtered_transactions

    subvariant_ids = {t.subvariant_id for t in filtered_transactions}

    full_history = (
        StockTransaction.objects
        .filter(subvariant_id__in=subvariant_ids)
        .order_by("subvariant_id", "created_at", "id")
        .values("id", "subvariant_id", "transaction_type", "quantity")
    )

    balance_by_subvariant = {}
    balance_for_txn_id = {}

    for row in full_history:
        sv_id = row["subvariant_id"]
        running = balance_by_subvariant.get(sv_id, 0)

        if row["transaction_type"] == StockTransaction.PURCHASE:
            running += row["quantity"]
        else:  # SALE
            running -= row["quantity"]

        balance_by_subvariant[sv_id] = running
        balance_for_txn_id[row["id"]] = running

    for txn in filtered_transactions:
        txn.running_balance = balance_for_txn_id.get(txn.id)

    return filtered_transactions


def _build_sku(product, options):
    option_values = [
        option.value.upper().replace(" ", "-") for option in options
    ]
    return f"{product.ProductCode}-" + "-".join(option_values)


def regenerate_subvariants(product):
    """
    Add any NEW combinations created by the latest variant/option change.
    Does NOT delete existing sub-variants, so stock on existing combinations
    is preserved. Only brand-new combinations (e.g. after adding a variant
    or a new option) get created with stock=0.
    """

    option_groups = []

    variants = (
        ProductVariant.objects
        .filter(product=product)
        .prefetch_related("options")
    )

    for variant in variants:
        options = list(variant.options.all())
        if options:
            option_groups.append(options)

    if not option_groups:
        return

    existing_keys = set(
        SubVariant.objects
        .filter(product=product)
        .values_list("combination_key", flat=True)
    )

    combinations = cartesian_product(*option_groups)
    created_count = 0

    for combination in combinations:

        option_ids = sorted(str(option.id) for option in combination)
        combination_key = "|".join(option_ids)

        if combination_key in existing_keys:
            continue  # already exists, leave its stock untouched

        sku = _build_sku(product, combination)

        subvariant = SubVariant.objects.create(
            product=product,
            sku=sku,
            combination_key=combination_key,
            stock=0,
        )
        subvariant.options.set(combination)
        created_count += 1

    if created_count:
        logger.info(
            "Generated %s new sub-variant(s) for product %s",
            created_count,
            product.ProductCode,
        )


def sync_product_stock(product):
    total_stock = (
        SubVariant.objects
        .filter(product=product)
        .aggregate(total=Sum("stock"))["total"]
        or 0
    )
    product.TotalStock = total_stock
    product.save(update_fields=["TotalStock"])


@transaction.atomic
def purchase_stock(subvariant_id, quantity, notes=None):

    # lock the row to avoid race conditions with concurrent requests
    subvariant = SubVariant.objects.select_for_update().get(pk=subvariant_id)

    subvariant.stock += quantity
    subvariant.save(update_fields=["stock"])

    StockTransaction.objects.create(
        product=subvariant.product,
        subvariant=subvariant,
        transaction_type=StockTransaction.PURCHASE,
        quantity=quantity,
        notes=notes,
    )

    sync_product_stock(subvariant.product)

    logger.info(
        "PURCHASE: sku=%s qty=%s new_stock=%s",
        subvariant.sku, quantity, subvariant.stock,
    )

    return subvariant


@transaction.atomic
def sale_stock(subvariant_id, quantity, notes=None):

    # lock the row so two concurrent sales can't both pass the check
    subvariant = SubVariant.objects.select_for_update().get(pk=subvariant_id)

    if subvariant.stock < quantity:
        logger.warning(
            "SALE REJECTED (insufficient stock): sku=%s requested=%s available=%s",
            subvariant.sku, quantity, subvariant.stock,
        )
        raise ValueError(
            f"Insufficient stock. Available: {subvariant.stock}, requested: {quantity}"
        )

    subvariant.stock -= quantity
    subvariant.save(update_fields=["stock"])

    StockTransaction.objects.create(
        product=subvariant.product,
        subvariant=subvariant,
        transaction_type=StockTransaction.SALE,
        quantity=quantity,
        notes=notes,
    )

    sync_product_stock(subvariant.product)

    logger.info(
        "SALE: sku=%s qty=%s new_stock=%s",
        subvariant.sku, quantity, subvariant.stock,
    )

    return subvariant