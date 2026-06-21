// src/components/stock/ProductSubVariantSelect.jsx
import { useEffect, useState } from "react";
import { listProducts, getSubVariants } from "../../api/productService";

export default function ProductSubVariantSelect({
  selectedProductId,
  selectedSubVariantId,
  onProductChange,
  onSubVariantChange,
  errors = {},
}) {
  const [products, setProducts] = useState([]);
  const [subVariants, setSubVariants] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingSubVariants, setLoadingSubVariants] = useState(false);

  // load all products once (page_size large enough for a typical dropdown;
  // for very large catalogs this would need search-as-you-type instead)
  useEffect(() => {
    let active = true;
    listProducts({ page: 1, page_size: 100 })
      .then((data) => {
        if (active) setProducts(data.results ?? data);
      })
      .finally(() => {
        if (active) setLoadingProducts(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // load sub-variants whenever selected product changes
  useEffect(() => {
    if (!selectedProductId) {
      setSubVariants([]);
      return;
    }

    let active = true;
    setLoadingSubVariants(true);

    getSubVariants(selectedProductId)
      .then((data) => {
        if (active) setSubVariants(data.results ?? data);
      })
      .finally(() => {
        if (active) setLoadingSubVariants(false);
      });

    return () => {
      active = false;
    };
  }, [selectedProductId]);

  const selectedSubVariant = subVariants.find(
    (sv) => String(sv.id) === String(selectedSubVariantId)
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Product
        </label>
        <select
          value={selectedProductId || ""}
          onChange={(e) => onProductChange(e.target.value)}
          disabled={loadingProducts}
          className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.product ? "border-red-400" : "border-gray-300"
          }`}
        >
          <option value="">
            {loadingProducts ? "Loading products..." : "Select a product"}
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.ProductName} ({p.ProductCode})
            </option>
          ))}
        </select>
        {errors.product && (
          <p className="text-red-500 text-xs mt-1">{errors.product}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Sub-Variant
        </label>
        <select
          value={selectedSubVariantId || ""}
          onChange={(e) => onSubVariantChange(e.target.value)}
          disabled={!selectedProductId || loadingSubVariants}
          className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.subVariant ? "border-red-400" : "border-gray-300"
          }`}
        >
          <option value="">
            {!selectedProductId
              ? "Select a product first"
              : loadingSubVariants
              ? "Loading sub-variants..."
              : "Select a sub-variant"}
          </option>
          {subVariants.map((sv) => (
            <option key={sv.id} value={sv.id}>
              {sv.sku} — {(sv.option_values || []).join(" / ")}
            </option>
          ))}
        </select>
        {errors.subVariant && (
          <p className="text-red-500 text-xs mt-1">{errors.subVariant}</p>
        )}

        {selectedSubVariant && (
          <p className="text-xs text-gray-500 mt-1">
            Available stock:{" "}
            <span className="font-medium text-gray-700">
              {selectedSubVariant.stock}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}