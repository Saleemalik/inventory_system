// src/pages/ProductList.jsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { listProducts, deleteProduct } from "../api/productService";
import PaginationControls from "../components/common/PaginationControls";
import ProductDetailDrawer from "../components/products/ProductDetailDrawer";
import ConfirmModal from "../components/common/ConfirmModal";

export default function ProductList() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [viewingProduct, setViewingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, page_size: pageSize };
      if (search.trim()) params.search = search.trim();

      const data = await listProducts(params);
      setProducts(data.results ?? data);
      setCount(data.count ?? (data.results ?? data).length);
    } catch (err) {
      setError("Failed to load products. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // reset to page 1 on new search
  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleDeleteConfirm = async () => {
    if (!deletingProduct) return;
    try {
      await deleteProduct(deletingProduct.id);
      toast.success("Product deactivated.");
      setDeletingProduct(null);
      fetchProducts();
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        toast.error("Product not found.");
      } else {
        toast.error("Failed to delete product.");
      }
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Products</h1>
        <button
          onClick={() => navigate("/app/products/new")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + New Product
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by product name or code..."
          className="w-full md:w-80 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading && (
          <div className="p-8 text-center text-gray-400">Loading products...</div>
        )}

        {!loading && error && (
          <div className="p-8 text-center text-red-500">{error}</div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            No products found{search ? ` for "${search}"` : ""}.
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3">Product Code</th>
                <th className="px-4 py-3">HSN Code</th>
                <th className="px-4 py-3 text-right">Total Stock</th>
                <th className="px-4 py-3">Created Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.ProductName}</td>
                  <td className="px-4 py-3 text-gray-600">{p.ProductCode}</td>
                  <td className="px-4 py-3 text-gray-600">{p.HSNCode || "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{p.TotalStock}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(p.CreatedDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        p.Active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {p.Active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button
                      onClick={() => setViewingProduct(p)}
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </button>
                    <button
                      onClick={() => navigate(`/app/products/${p.id}/edit`)}
                      className="text-amber-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletingProduct(p)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && !error && products.length > 0 && (
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

      {viewingProduct && (
        <ProductDetailDrawer
          product={viewingProduct}
          onClose={() => setViewingProduct(null)}
        />
      )}

      {deletingProduct && (
        <ConfirmModal
          title="Delete product?"
          message={`This will deactivate "${deletingProduct.ProductName}". This action can be reversed by an admin.`}
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingProduct(null)}
        />
      )}
    </div>
  );
}