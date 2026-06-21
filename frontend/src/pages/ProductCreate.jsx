// src/pages/ProductCreate.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import VariantRow from "../components/products/VariantRow";
import SubVariantPreview from "../components/products/SubVariantPreview";
import { createProduct } from "../api/productService";

const emptyVariant = () => ({ name: "", options: [] });

export default function ProductCreate() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    ProductID: "",
    ProductName: "",
    ProductCode: "",
    HSNCode: "",
  });

  const [variants, setVariants] = useState([emptyVariant()]);
  const [errors, setErrors] = useState({});
  const [variantErrors, setVariantErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleVariantChange = (index, updated) => {
    setVariants((prev) => prev.map((v, i) => (i === index ? updated : v)));
  };

  const addVariantRow = () => {
    setVariants((prev) => [...prev, emptyVariant()]);
  };

  const removeVariantRow = (index) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const fieldErrors = {};

    if (!form.ProductName.trim()) {
      fieldErrors.ProductName = "Product name is required.";
    }
    if (!form.ProductCode.trim()) {
      fieldErrors.ProductCode = "Product code is required.";
    }
    if (!form.ProductID.trim()) {
      fieldErrors.ProductID = "Product ID is required.";
    } else if (!/^\d+$/.test(form.ProductID.trim())) {
      fieldErrors.ProductID = "Product ID must be a number.";
    }

    const vErrors = variants.map(() => ({}));
    const seenNames = new Set();
    let hasVariantIssue = false;

    if (variants.length === 0) {
      hasVariantIssue = true;
    }

    variants.forEach((variant, idx) => {
      const name = variant.name.trim();

      if (!name) {
        vErrors[idx].name = "Variant name is required.";
        hasVariantIssue = true;
      } else if (seenNames.has(name.toLowerCase())) {
        vErrors[idx].name = "Duplicate variant name.";
        hasVariantIssue = true;
      } else {
        seenNames.add(name.toLowerCase());
      }

      if (!variant.options || variant.options.length === 0) {
        vErrors[idx].options = "At least one option is required.";
        hasVariantIssue = true;
      }
    });

    setErrors(fieldErrors);
    setVariantErrors(vErrors);

    if (hasVariantIssue && variants.length === 0) {
      toast.error("At least one variant is required.");
    }

    return Object.keys(fieldErrors).length === 0 && !hasVariantIssue;
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
      variants: variants.map((v) => ({
        name: v.name.trim(),
        options: v.options.map((opt) => ({ value: opt })),
      })),
    };

    try {
      await createProduct(payload);
      toast.success("Product created successfully.");
      navigate("/app/products");
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;

      if (status === 400 && data) {
        // surface DRF validation errors (field-level or non_field_errors)
        const messages = Object.entries(data)
          .map(([key, val]) => (Array.isArray(val) ? val.join(" ") : String(val)))
          .join(" ");
        toast.error(messages || "Validation failed. Please check your input.");
      } else if (status === 409) {
        toast.error(data?.detail || "A product with this code already exists.");
      } else if (status === 404) {
        toast.error("Resource not found.");
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
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 text-gray-800">Create Product</h1>

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
                onChange={handleFieldChange}
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
                onChange={handleFieldChange}
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
                onChange={handleFieldChange}
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
                onChange={handleFieldChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-800">Variants</h2>
            <button
              type="button"
              onClick={addVariantRow}
              className="text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-100"
            >
              + Add Variant
            </button>
          </div>

          <div className="space-y-4">
            {variants.map((variant, idx) => (
              <VariantRow
                key={idx}
                index={idx}
                variant={variant}
                onChange={handleVariantChange}
                onRemove={removeVariantRow}
                error={variantErrors[idx]}
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-800 mb-4">
            Sub-Variant Preview
          </h2>
          <SubVariantPreview variants={variants} productCode={form.ProductCode} />
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
            {submitting ? "Creating..." : "Create Product"}
          </button>
        </div>
      </form>
    </div>
  );
}