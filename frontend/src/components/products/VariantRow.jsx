// src/components/products/VariantRow.jsx
import TagInput from "./TagInput";

export default function VariantRow({ variant, index, onChange, onRemove, error }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 relative">
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute top-3 right-3 text-gray-400 hover:text-red-600 text-sm"
        aria-label="Remove variant"
      >
        Remove
      </button>

      <label className="block text-sm font-medium text-gray-700 mb-1">
        Variant name (e.g. Size, Color)
      </label>
      <input
        type="text"
        value={variant.name}
        onChange={(e) => onChange(index, { ...variant, name: e.target.value })}
        placeholder="e.g. Size"
        className={`w-full border rounded-lg px-3 py-2 mb-1 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error?.name ? "border-red-400" : "border-gray-300"
        }`}
      />
      {error?.name && <p className="text-red-500 text-xs mb-2">{error.name}</p>}

      <label className="block text-sm font-medium text-gray-700 mb-1 mt-2">
        Options
      </label>
      <TagInput
        value={variant.options}
        onChange={(options) => onChange(index, { ...variant, options })}
        placeholder="Type a value, press Enter (e.g. S, M, L)"
      />
      {error?.options && <p className="text-red-500 text-xs mt-1">{error.options}</p>}
    </div>
  );
}