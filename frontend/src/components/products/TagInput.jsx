// src/components/products/TagInput.jsx
import { useState } from "react";

export default function TagInput({ value = [], onChange, placeholder }) {
  const [draft, setDraft] = useState("");

  const addTag = (raw) => {
    const cleaned = raw.trim();
    if (!cleaned) return;

    const exists = value.some((v) => v.toLowerCase() === cleaned.toLowerCase());
    if (exists) {
      setDraft("");
      return;
    }

    onChange([...value, cleaned]);
    setDraft("");
  };

  const removeTag = (index) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  const handleBlur = () => {
    if (draft.trim()) {
      addTag(draft);
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg px-2 py-2 flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-blue-500">
      {value.map((tag, idx) => (
        <span
          key={`${tag}-${idx}`}
          className="flex items-center gap-1 bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-md"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(idx)}
            className="text-blue-600 hover:text-blue-900 font-bold leading-none"
            aria-label={`Remove ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder || "Type and press Enter..."}
        className="flex-1 min-w-[120px] outline-none text-sm py-1"
      />
    </div>
  );
}