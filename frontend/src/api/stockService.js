// src/api/stockService.js
import api from "./api";

export const purchaseStock = async (payload) => {
  // payload: { subvariant_id, quantity, notes }
  const res = await api.post("stock/purchase/", payload);
  return res.data;
};

export const saleStock = async (payload) => {
  const res = await api.post("stock/sale/", payload);
  return res.data;
};

// params: { page, page_size }
export const getStockLevels = async (params = {}) => {
  const res = await api.get("stock/", { params });
  return res.data;
};

// params: { page, page_size, product_id, transaction_type, start_date, end_date }
export const getStockReport = async (params = {}) => {
  const res = await api.get("stock/report/", { params });
  return res.data;
};