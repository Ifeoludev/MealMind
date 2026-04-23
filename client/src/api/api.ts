import axios from "axios";

// In dev, VITE_API_URL is unset so baseURL falls back to "/api" — Vite's proxy
// handles the redirect to localhost:3001. In production (Vercel), VITE_API_URL
// is set to the Railway backend URL so requests go directly to the right server.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  timeout: 90000, // 90s — AI generation can take 30s+, give it headroom
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("mealmind_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
