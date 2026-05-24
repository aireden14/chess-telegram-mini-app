import axios from "axios";
import { useAuthStore } from "../store/auth";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const API_BASE_URL = API_URL.replace(/\/$/, "");

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

export function wakeBackend(): Promise<void> {
  if (typeof fetch !== "function") {
    return Promise.resolve();
  }

  return fetch(`${API_BASE_URL}/api/health`, {
    cache: "no-store",
    keepalive: true,
  })
    .then(() => undefined)
    .catch(() => undefined);
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});
