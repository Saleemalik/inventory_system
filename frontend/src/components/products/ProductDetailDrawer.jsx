// src/components/products/ProductDetailDrawer.jsx
import { useEffect, useState } from "react";
import { getSubVariants } from "../../api/productService";

export default function ProductDetailDrawer({ product, onClose }) {
  const [subVariants, setSubVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!product) return;

    let active = true;
    setLoading(true);
    setError(null);

    getSubVariants(product.id)
      .then((data) => {
        if (!active) return;
        setSubVariants(data.results ?? data);
      })
      .catch(() => {
        if (active) setError("Failed to load sub-variants.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [product]);

  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white h-full shadow-xl p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {product.ProductName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="text-sm text-gray-600 space-y-1 mb-6">
          <p>
            <span className="font-medium">Code:</span> {product.ProductCode}
          </p>
          <p>
            <span className="font-medium">HSN:</span> {product.HSNCode || "—"}
          </p>
          <p>
            <span className="font-medium">Total Stock:</span>{" "}
            {product.TotalStock}
          </p>
          <p>
            <span className="font-medium">Status:</span>{" "}
            {product.Active ? "Active" : "Inactive"}
          </p>
        </div>

        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Sub-Variants & Stock
        </h3>

        {loading && <p className="text-sm text-gray-400">Loading...</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}

        {!loading && !error && subVariants.length === 0 && (
          <p className="text-sm text-gray-400 italic">No sub-variants found.</p>
        )}

        {!loading && !error && subVariants.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-600">
                <tr>
                  <th className="text-left px-3 py-2">SKU</th>
                  <th className="text-left px-3 py-2">Options</th>
                  <th className="text-right px-3 py-2">Stock</th>
                </tr>
              </thead>
              <tbody>
                {subVariants.map((sv) => (
                  <tr key={sv.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-mono text-xs">{sv.sku}</td>
                    <td className="px-3 py-2">
                      {(sv.option_values || []).join(" / ")}
                    </td>
                    <td className="px-3 py-2 text-right">{sv.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}