import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const path = error.config?.url ?? "";

    if (
      error.response?.status === 401 &&
      !path.startsWith("/auth/")
    ) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("role");

      if (window.location.pathname !== "/login") {
        window.location.assign("/login?reason=expired");
      }
    }

    return Promise.reject(error);
  }
);

export default api;
