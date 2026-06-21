// src/App.jsx
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProductList from "./pages/ProductList";
import ProductCreate from "./pages/ProductCreate";
import StockManagement from "./pages/StockManagement";
import StockReport from "./pages/StockReport";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layout/AppLayout";

export default function App() {
  return (
    <Router>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="products" element={<ProductList />} />
          <Route path="products/new" element={<ProductCreate />} />
          <Route path="stock" element={<StockManagement />} />
          <Route path="stock/report" element={<StockReport />} />
        </Route>
      </Routes>
    </Router>
  );
}