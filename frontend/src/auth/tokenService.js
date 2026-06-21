export const setToken = (data) => {
  localStorage.setItem("access", data.access);
    localStorage.setItem("refresh", data.refresh);
}

export const getAccessToken = () => {
        return localStorage.getItem("access");
    }

export const clearToken = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
}

export const isAuthenticated = () => {
    return !!localStorage.getItem("access");
}