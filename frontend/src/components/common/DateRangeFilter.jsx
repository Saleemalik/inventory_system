// src/components/common/DateRangeFilter.jsx
export default function DateRangeFilter({ startDate, endDate, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Start Date
        </label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onChange({ startDate: e.target.value, endDate })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <span className="text-gray-400 mt-5">to</span>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          End Date
        </label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onChange({ startDate, endDate: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {(startDate || endDate) && (
        <button
          onClick={() => onChange({ startDate: "", endDate: "" })}
          className="text-xs text-gray-500 hover:text-gray-700 mt-5 underline"
        >
          Clear
        </button>
      )}
    </div>
  );
}