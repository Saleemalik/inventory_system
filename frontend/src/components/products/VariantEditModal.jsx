// src/components/products/VariantEditModal.jsx
import { useState } from "react";
import TagInput from "./TagInput";

export default function VariantEditModal({ variant, onSave, onCancel, saving }) {
  const [name, setName] = useState(variant.name);
  const [options, setOptions] = useState(
    (variant.options || []).map((opt) => opt.value)
  );
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = "Variant name is required.";
    }

    if (options.length === 0) {
      newErrors.options = "At least one option is required.";
    } else {
      const lower = options.map((o) => o.toLowerCase());
      if (new Set(lower).size !== lower.length) {
        newErrors.options = "Duplicate options are not allowed.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ name: name.trim(), options });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Edit Variant</h3>

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Variant name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`w-full border rounded-lg px-3 py-2 mb-1 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? "border-red-400" : "border-gray-300"
          }`}
        />
        {errors.name && <p className="text-red-500 text-xs mb-2">{errors.name}</p>}

        <label className="block text-sm font-medium text-gray-700 mb-1 mt-3">
          Options
        </label>
        <TagInput value={options} onChange={setOptions} />
        {errors.options && (
          <p className="text-red-500 text-xs mt-1">{errors.options}</p>
        )}

        <p className="text-xs text-amber-600 mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Changing options regenerates sub-variant combinations. Existing
          combinations that are no longer valid (and their stock) will be
          removed; new combinations start at zero stock.
        </p>

        <div className="flex justify-end gap-3 mt-5">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Variant"}
          </button>
        </div>
      </div>
    </div>
  );
}