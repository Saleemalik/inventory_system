// src/pages/StockReport.jsx
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getStockReport } from "../api/stockService";
import { listProducts } from "../api/productService";
import PaginationControls from "../components/common/PaginationControls";
import DateRangeFilter from "../components/common/DateRangeFilter";
import { exportToCsv } from "../utils/exportCsv";

const TRANSACTION_TYPES = [
  { value: "", label: "All Types" },
  { value: "PURCHASE", label: "Purchase" },
  { value: "SALE", label: "Sale" },
];

export default function StockReport() {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    listProducts({ page: 1, page_size: 100 }).then((data) => {
      setProducts(data.results ?? data);
    });
  }, []);

  const buildParams = useCallback(
    (overridePage, overridePageSize) => {
      const params = {
        page: overridePage ?? page,
        page_size: overridePageSize ?? pageSize,
      };
      if (productId) params.product_id = productId;
      if (transactionType) params.transaction_type = transactionType;
      if (dateRange.startDate) params.start_date = dateRange.startDate;
      if (dateRange.endDate) params.end_date = dateRange.endDate;
      return params;
    },
    [page, pageSize, productId, transactionType, dateRange]
  );

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStockReport(buildParams());
      setRows(data.results ?? data);
      setCount(data.count ?? (data.results ?? data).length);
    } catch (err) {
      const status = err.response?.status;
      if (status === 400) {
        setError("Invalid filter values. Please check the date range.");
      } else {
        setError("Failed to load stock report.");
      }
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [productId, transactionType, dateRange]);

  const handleExport = async () => {
    setExporting(true);
    try {
      // export covers the current filters across ALL pages, not just the
      // visible page, since that's what "export" usually means to a user
      const data = await getStockReport({ ...buildParams(1, 1000) });
      const allRows = data.results ?? data;

      if (allRows.length === 0) {
        toast.error("No data to export for the current filters.");
        return;
      }

      exportToCsv(`stock-report-${Date.now()}.csv`, allRows, [
        { key: "created_at", label: "Date & Time", value: (r) => new Date(r.created_at).toLocaleString() },
        { key: "product_name", label: "Product" },
        { key: "sku", label: "Sub-Variant SKU" },
        { key: "transaction_type", label: "Transaction Type" },
        { key: "quantity", label: "Quantity" },
        { key: "running_balance", label: "Running Balance" },
        { key: "notes", label: "Notes" },
      ]);

      toast.success("Report exported.");
    } catch {
      toast.error("Failed to export report.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Stock Report</h1>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 disabled:opacity-50 text-sm"
        >
          {exporting ? "Exporting..." : "Export to CSV"}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Product
          </label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.ProductName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Transaction Type
          </label>
          <select
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TRANSACTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <DateRangeFilter
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onChange={setDateRange}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading && (
          <div className="p-8 text-center text-gray-400">Loading report...</div>
        )}

        {!loading && error && (
          <div className="p-8 text-center text-red-500">{error}</div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            No transactions found for the selected filters.
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-3">Date &amp; Time</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Sub-Variant</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Running Balance</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-800">{row.product_name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {row.sku}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        row.transaction_type === "PURCHASE"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {row.transaction_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {row.quantity}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">
                    {row.running_balance}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{row.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && !error && rows.length > 0 && (
          <PaginationControls
            page={page}
            pageSize={pageSize}
            count={count}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
      </div>
    </div>
  );
}