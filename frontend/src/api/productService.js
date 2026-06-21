// src/api/productService.js
import api from "./api";

export const createProduct = async (payload) => {
  const res = await api.post("products/", payload);
  return res.data;
};

export const updateProduct = async (id, payload) => {
  const res = await api.put(`products/${id}/`, payload);
  return res.data;
};

export const deleteProduct = async (id) => {
  const res = await api.delete(`products/${id}/`);
  return res.data;
};

export const getProduct = async (id) => {
  const res = await api.get(`products/${id}/`);
  return res.data;
};

// params: { page, page_size, search }
export const listProducts = async (params = {}) => {
  const res = await api.get("products/", { params });
  return res.data; // { count, next, previous, results }
};

export const getSubVariants = async (productId) => {
  const res = await api.get(`products/${productId}/subvariants/`);
  return res.data; // { count, next, previous, results } (paginated) or array
};

export const getVariants = async (productId) => {
  const res = await api.get(`products/${productId}/variants/`);
  return res.data;
};

export const addVariant = async (productId, payload) => {
  const res = await api.post(`products/${productId}/variants/`, payload);
  return res.data;
};

export const updateVariant = async (variantId, payload) => {
  const res = await api.put(`variants/${variantId}/`, payload);
  return res.data;
};

export const deleteVariant = async (variantId) => {
  const res = await api.delete(`variants/${variantId}/`);
  return res.data;
};