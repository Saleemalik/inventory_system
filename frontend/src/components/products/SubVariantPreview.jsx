// src/components/products/SubVariantPreview.jsx

// Computes the cartesian product of variant options client-side,
// purely for preview purposes (backend regenerates the real ones).
function cartesianProduct(arrays) {
  if (arrays.length === 0) return [];
  return arrays.reduce(
    (acc, curr) =>
      acc.flatMap((combo) => curr.map((value) => [...combo, value])),
    [[]]
  );
}

export default function SubVariantPreview({ variants, productCode }) {
  const validVariants = variants.filter(
    (v) => v.name.trim() && v.options.length > 0
  );

  if (validVariants.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">
        Add at least one variant with options to preview sub-variants.
      </p>
    );
  }

  const optionArrays = validVariants.map((v) => v.options);
  const combinations = cartesianProduct(optionArrays);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-gray-600">
          <tr>
            <th className="text-left px-3 py-2">#</th>
            {validVariants.map((v) => (
              <th key={v.name} className="text-left px-3 py-2 capitalize">
                {v.name || "Variant"}
              </th>
            ))}
            <th className="text-left px-3 py-2">Preview SKU</th>
          </tr>
        </thead>
        <tbody>
          {combinations.map((combo, idx) => {
            const sku =
              (productCode || "PROD") +
              "-" +
              combo.map((v) => v.toUpperCase().replace(/\s+/g, "-")).join("-");
            return (
              <tr key={idx} className="border-t border-gray-100">
                <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                {combo.map((value, i) => (
                  <td key={i} className="px-3 py-2">
                    {value}
                  </td>
                ))}
                <td className="px-3 py-2 text-gray-500 font-mono text-xs">{sku}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="bg-gray-50 px-3 py-2 text-xs text-gray-500">
        {combinations.length} sub-variant{combinations.length !== 1 ? "s" : ""} will be generated
      </div>
    </div>
  );
}