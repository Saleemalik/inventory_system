// src/api/api.js
import axios from "axios";
import { getAccessToken, setToken, clearToken } from "../auth/tokenService";

const API_BASE = import.meta.env.VITE_API_BASE;
const API_REFRESH = `${API_BASE}/token/refresh/`;

let startLoading = null;
let stopLoading = null;

// Optional loader injection
export const injectLoader = (start, stop) => {
  startLoading = start;
  stopLoading = stop;
};

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

const redirectToLogin = async () => {
  if (window.location.pathname !== "/login") {
    window.location.href = "/login"
  }
};

// ✅ REQUEST INTERCEPTOR
api.interceptors.request.use(
  (config) => {
    if (!config.skipLoading) {
      startLoading && startLoading();
    }

    const token = getAccessToken();
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    stopLoading && stopLoading();
    return Promise.reject(error);
  },
);

// ✅ RESPONSE INTERCEPTOR
api.interceptors.response.use(
  (response) => {
    if (!response.config.skipLoading) {
      stopLoading && stopLoading();
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest?.skipLoading) {
      stopLoading && stopLoading();
    }

    // ✅ SAFE CHECK (important fix)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refresh");

      if (!refreshToken) {
        clearToken();
  
        await redirectToLogin();
        return Promise.reject(error);
      }

      try {
        startLoading && startLoading();

        const res = await axios.post(API_REFRESH, {
          refresh: refreshToken,
        });

        // ✅ use tokenService properly
        setToken(res.data);

        originalRequest.headers["Authorization"] = `Bearer ${res.data.access}`;
        return api(originalRequest);
      } catch (err) {
        clearToken();
        await redirectToLogin();
        return Promise.reject(err);
      } finally {
        stopLoading && stopLoading();
      }
    }

    return Promise.reject(error);
  },
);

export default api;
