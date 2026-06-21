// src/utils/exportCsv.js

export function exportToCsv(filename, rows, columns) {
  // columns: [{ key, label }]
  if (!rows || rows.length === 0) return;

  const header = columns.map((c) => csvEscape(c.label)).join(",");

  const lines = rows.map((row) =>
    columns
      .map((c) => csvEscape(typeof c.value === "function" ? c.value(row) : row[c.key]))
      .join(",")
  );

  const csvContent = [header, ...lines].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}