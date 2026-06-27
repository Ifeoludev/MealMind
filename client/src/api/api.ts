import axios from "axios";

// VITE_API_URL should be the bare origin e.g. https://mealmind-production-b7ed.up.railway.app
// We append /api here so all relative paths (/auth/login etc.) resolve correctly.
// In dev, VITE_API_URL is unset so baseURL falls back to /api — Vite's proxy handles the rest.
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

const api = axios.create({
  baseURL,
  timeout: 90000,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("mealmind_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function logout() {
  localStorage.removeItem("mealmind_token");
  localStorage.removeItem("mealmind_user");
  window.location.href = "/login";
}

let refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    if (response?.status !== 401 || config?.url === "/auth/refresh") {
      return Promise.reject(error);
    }

    if (config._retried) {
      logout();
      return Promise.reject(error);
    }
    config._retried = true;

    try {
      if (!refreshPromise) {
        refreshPromise = api
          .post("/auth/refresh")
          .then((res) => res.data.token as string)
          .finally(() => {
            refreshPromise = null;
          });
      }
      const newToken = await refreshPromise;
      localStorage.setItem("mealmind_token", newToken);
      config.headers.Authorization = `Bearer ${newToken}`;
      return api(config);
    } catch {
      logout();
      return Promise.reject(error);
    }
  }
);

export default api;
