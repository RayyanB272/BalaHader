import axios from "axios";
import { clearSession } from "./sessionService";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  // Let the browser set the multipart boundary for file uploads. Keeping the
  // client's JSON default here makes FastAPI treat the request as if no file
  // was sent and results in a 422 response.
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
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
      clearSession();

      if (window.location.pathname !== "/login") {
        window.location.assign("/login?reason=expired");
      }
    }

    return Promise.reject(error);
  }
);

export default api;
