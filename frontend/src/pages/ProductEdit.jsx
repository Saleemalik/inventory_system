// src/pages/ProductEdit.jsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { getProduct, updateProduct, getVariants, updateVariant, deleteVariant } from "../api/productService";
import VariantEditModal from "../components/products/VariantEditModal";
import ConfirmModal from "../components/common/ConfirmModal";

export default function ProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    ProductID: "",
    ProductName: "",
    ProductCode: "",
    HSNCode: "",
    Active: true,
  });

  const [subVariants, setSubVariants] = useState([]);
  const [variants, setVariants] = useState([]);
  const [variantsLoading, setVariantsLoading] = useState(true);
  const [editingVariant, setEditingVariant] = useState(null);
  const [savingVariant, setSavingVariant] = useState(false);
  const [deletingVariant, setDeletingVariant] = useState(null);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const refreshProduct = useCallback(async () => {
    const data = await getProduct(id);
    setForm({
      ProductID: String(data.ProductID ?? ""),
      ProductName: data.ProductName ?? "",
      ProductCode: data.ProductCode ?? "",
      HSNCode: data.HSNCode ?? "",
      Active: data.Active,
    });
    setSubVariants(data.subvariants ?? []);
    return data;
  }, [id]);

  const refreshVariants = useCallback(async () => {
    setVariantsLoading(true);
    try {
      const data = await getVariants(id);
      setVariants(data.results ?? data);
    } catch {
      toast.error("Failed to load variants.");
    } finally {
      setVariantsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let active = true;

    refreshProduct()
      .catch((err) => {
        if (!active) return;
        const status = err.response?.status;
        setLoadError(
          status === 404
            ? "Product not found."
            : "Failed to load product. Please try again."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, refreshProduct]);

  useEffect(() => {
    refreshVariants();
  }, [refreshVariants]);

  const handleVariantSave = async ({ name, options }) => {
    setSavingVariant(true);
    try {
      await updateVariant(editingVariant.id, { name, options });
      toast.success("Variant updated successfully.");
      setEditingVariant(null);
      await Promise.all([refreshVariants(), refreshProduct()]);
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;

      if (status === 400 && data) {
        const messages = Object.entries(data)
          .map(([key, val]) => (Array.isArray(val) ? val.join(" ") : String(val)))
          .join(" ");
        toast.error(messages || "Validation failed.");
      } else if (status === 404) {
        toast.error("Variant not found. It may have already been deleted.");
        setEditingVariant(null);
        refreshVariants();
      } else if (status >= 500) {
        toast.error("Server error. Please try again later.");
      } else {
        toast.error("Failed to update variant.");
      }
    } finally {
      setSavingVariant(false);
    }
  };

  const handleVariantDeleteConfirm = async () => {
    if (!deletingVariant) return;
    try {
      await deleteVariant(deletingVariant.id);
      toast.success("Variant deleted successfully.");
      setDeletingVariant(null);
      await Promise.all([refreshVariants(), refreshProduct()]);
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        toast.error("Variant not found. It may have already been deleted.");
      } else {
        toast.error("Failed to delete variant.");
      }
      setDeletingVariant(null);
      refreshVariants();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const newErrors = {};

    if (!form.ProductName.trim()) {
      newErrors.ProductName = "Product name is required.";
    }
    if (!form.ProductCode.trim()) {
      newErrors.ProductCode = "Product code is required.";
    }
    if (!form.ProductID.trim()) {
      newErrors.ProductID = "Product ID is required.";
    } else if (!/^\d+$/.test(form.ProductID.trim())) {
      newErrors.ProductID = "Product ID must be a number.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast.error("Please fix the errors in the form.");
      return;
    }

    setSubmitting(true);

    const payload = {
      ProductID: Number(form.ProductID),
      ProductName: form.ProductName.trim(),
      ProductCode: form.ProductCode.trim(),
      HSNCode: form.HSNCode.trim() || null,
      Active: form.Active,
    };

    try {
      await updateProduct(id, payload);
      toast.success("Product updated successfully.");
      navigate("/app/products");
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;

      if (status === 400 && data) {
        const messages = Object.entries(data)
          .map(([key, val]) => (Array.isArray(val) ? val.join(" ") : String(val)))
          .join(" ");
        toast.error(messages || "Validation failed. Please check your input.");
      } else if (status === 404) {
        toast.error("Product not found. It may have been deleted.");
      } else if (status === 409) {
        toast.error(data?.detail || "A product with this code already exists.");
      } else if (status >= 500) {
        toast.error("Server error. Please try again later.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading product...</div>;
  }

  if (loadError) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <p className="text-red-500 mb-4">{loadError}</p>
        <Link to="/app/products" className="text-blue-600 hover:underline">
          Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 text-gray-800">Edit Product</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product ID
              </label>
              <input
                name="ProductID"
                type="text"
                value={form.ProductID}
                onChange={handleChange}
                className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.ProductID ? "border-red-400" : "border-gray-300"
                }`}
              />
              {errors.ProductID && (
                <p className="text-red-500 text-xs mt-1">{errors.ProductID}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name
              </label>
              <input
                name="ProductName"
                type="text"
                value={form.ProductName}
                onChange={handleChange}
                className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.ProductName ? "border-red-400" : "border-gray-300"
                }`}
              />
              {errors.ProductName && (
                <p className="text-red-500 text-xs mt-1">{errors.ProductName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Code
              </label>
              <input
                name="ProductCode"
                type="text"
                value={form.ProductCode}
                onChange={handleChange}
                className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.ProductCode ? "border-red-400" : "border-gray-300"
                }`}
              />
              {errors.ProductCode && (
                <p className="text-red-500 text-xs mt-1">{errors.ProductCode}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                HSN Code (optional)
              </label>
              <input
                name="HSNCode"
                type="text"
                value={form.HSNCode}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              id="active-toggle"
              type="checkbox"
              checked={form.Active}
              onChange={(e) => setForm((prev) => ({ ...prev, Active: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="active-toggle" className="text-sm text-gray-700">
              Active
            </label>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-800 mb-2">Variants</h2>
          <p className="text-sm text-gray-500 mb-4">
            Editing a variant's options regenerates sub-variant combinations.
            Deleting a variant removes any sub-variant combinations tied to
            it, along with their stock.
          </p>

          {variantsLoading ? (
            <p className="text-sm text-gray-400">Loading variants...</p>
          ) : variants.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No variants found.</p>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-gray-600">
                  <tr>
                    <th className="text-left px-3 py-2">Name</th>
                    <th className="text-left px-3 py-2">Options</th>
                    <th className="text-right px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v) => (
                    <tr key={v.id} className="border-t border-gray-100">
                      <td className="px-3 py-2 capitalize">{v.name}</td>
                      <td className="px-3 py-2">
                        {(v.options || []).map((o) => o.value).join(", ")}
                      </td>
                      <td className="px-3 py-2 text-right space-x-3">
                        <button
                          type="button"
                          onClick={() => setEditingVariant(v)}
                          className="text-amber-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingVariant(v)}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-medium text-gray-800">
              Sub-Variants &amp; Stock
            </h2>
            <span className="text-xs text-gray-400">Read-only here</span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Auto-generated from the variants above. Manage stock from the
            Stock Management page.
          </p>

          {subVariants.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No sub-variants found.</p>
          ) : (
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

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/app/products")}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      {editingVariant && (
        <VariantEditModal
          variant={editingVariant}
          onSave={handleVariantSave}
          onCancel={() => setEditingVariant(null)}
          saving={savingVariant}
        />
      )}

      {deletingVariant && (
        <ConfirmModal
          title="Delete variant?"
          message={`Deleting "${deletingVariant.name}" will permanently remove any sub-variant combinations built from it, along with their stock history. This cannot be undone.`}
          confirmLabel="Delete Variant"
          onConfirm={handleVariantDeleteConfirm}
          onCancel={() => setDeletingVariant(null)}
        />
      )}
    </div>
  );
}