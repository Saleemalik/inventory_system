// src/pages/StockManagement.jsx
import { useState } from "react";
import toast from "react-hot-toast";
import ProductSubVariantSelect from "../components/stock/ProductSubVariantSelect";
import { purchaseStock, saleStock } from "../api/stockService";
import { getSubVariants } from "../api/productService";

const TABS = {
  PURCHASE: "purchase",
  SALE: "sale",
};

const initialForm = {
  productId: "",
  subVariantId: "",
  quantity: "",
  notes: "",
};

export default function StockManagement() {
  const [activeTab, setActiveTab] = useState(TABS.PURCHASE);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [availableStock, setAvailableStock] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setForm(initialForm);
    setErrors({});
    setAvailableStock(null);
    setLastTransaction(null);
  };

  const handleProductChange = (productId) => {
    setForm((prev) => ({ ...prev, productId, subVariantId: "" }));
    setAvailableStock(null);
    setErrors((prev) => ({ ...prev, product: undefined, subVariant: undefined }));
  };

  const handleSubVariantChange = async (subVariantId) => {
    setForm((prev) => ({ ...prev, subVariantId }));
    setErrors((prev) => ({ ...prev, subVariant: undefined }));

    if (!subVariantId || !form.productId) {
      setAvailableStock(null);
      return;
    }

    // refetch current stock for this sub-variant so the displayed number
    // is always fresh, even if the dropdown's cached list is stale
    try {
      const data = await getSubVariants(form.productId);
      const list = data.results ?? data;
      const match = list.find((sv) => String(sv.id) === String(subVariantId));
      setAvailableStock(match ? Number(match.stock) : null);
    } catch {
      setAvailableStock(null);
    }
  };

  const handleQuantityChange = (e) => {
    setForm((prev) => ({ ...prev, quantity: e.target.value }));
    setErrors((prev) => ({ ...prev, quantity: undefined }));
  };

  const validate = () => {
    const newErrors = {};

    if (!form.productId) newErrors.product = "Please select a product.";
    if (!form.subVariantId) newErrors.subVariant = "Please select a sub-variant.";

    const qty = Number(form.quantity);
    if (!form.quantity.trim()) {
      newErrors.quantity = "Quantity is required.";
    } else if (!Number.isInteger(qty) || qty <= 0) {
      newErrors.quantity = "Quantity must be a positive whole number.";
    } else if (
      activeTab === TABS.SALE &&
      availableStock !== null &&
      qty > availableStock
    ) {
      newErrors.quantity = `Quantity exceeds available stock (${availableStock}).`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);

    const payload = {
      subvariant_id: Number(form.subVariantId),
      quantity: Number(form.quantity),
      notes: form.notes.trim() || undefined,
    };

    try {
      const action = activeTab === TABS.PURCHASE ? purchaseStock : saleStock;
      const result = await action(payload);

      toast.success(
        activeTab === TABS.PURCHASE
          ? "Stock added successfully."
          : "Stock removed successfully."
      );

      setLastTransaction({
        type: activeTab,
        quantity: payload.quantity,
        newStock: result.stock,
      });

      // refresh the available-stock display in place
      if (result.stock !== undefined) {
        setAvailableStock(Number(result.stock));
      }

      setForm((prev) => ({ ...prev, quantity: "", notes: "" }));
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;

      if (status === 400) {
        toast.error(data?.detail || "Invalid request. Please check your input.");
      } else if (status === 404) {
        toast.error("Sub-variant not found.");
      } else if (status === 409) {
        toast.error(data?.detail || "Conflict: this action could not be completed.");
      } else if (status >= 500) {
        toast.error("Server error. Please try again later.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 text-gray-800">Stock Management</h1>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => switchTab(TABS.PURCHASE)}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            activeTab === TABS.PURCHASE
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Add Stock (Purchase)
        </button>
        <button
          onClick={() => switchTab(TABS.SALE)}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            activeTab === TABS.SALE
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Remove Stock (Sale)
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5"
      >
        <ProductSubVariantSelect
          selectedProductId={form.productId}
          selectedSubVariantId={form.subVariantId}
          onProductChange={handleProductChange}
          onSubVariantChange={handleSubVariantChange}
          errors={errors}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantity
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={form.quantity}
            onChange={handleQuantityChange}
            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.quantity ? "border-red-400" : "border-gray-300"
            }`}
            placeholder="e.g. 50"
          />
          {errors.quantity && (
            <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (optional)
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Optional notes about this transaction"
          />
        </div>

        {lastTransaction && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
            {lastTransaction.type === TABS.PURCHASE ? "Added" : "Removed"}{" "}
            {lastTransaction.quantity} units. Current stock:{" "}
            <span className="font-semibold">{lastTransaction.newStock}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-2.5 rounded-lg text-white font-medium disabled:opacity-50 ${
            activeTab === TABS.PURCHASE
              ? "bg-green-600 hover:bg-green-700"
              : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {submitting
            ? "Processing..."
            : activeTab === TABS.PURCHASE
            ? "Add Stock"
            : "Remove Stock"}
        </button>
      </form>
    </div>
  );
}