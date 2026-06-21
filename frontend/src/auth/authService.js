import api from "../api/api";
import {setToken} from "./tokenService";

export const loginUser = async (data) => {
  const res = await api.post("token/", data);
  setToken(res.data);
  return res.data;
};

export const registerUser = async (data) => {
  return api.post("register/", data);
};

export const logoutUser = () => {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  window.location.href = "/";
};

export const isAuthenticated = () => {
  return !!localStorage.getItem("access");
};

export const getCurrentUser = async () => {
    const res = await api.get("/accounts/me/");
    return res.data;
}
