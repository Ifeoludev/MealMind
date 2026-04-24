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
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("mealmind_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
