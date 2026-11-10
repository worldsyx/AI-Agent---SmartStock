import axios from 'axios';
import { generateIdempotencyKey } from '@/utils';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

// ─── Request interceptor — attach token ──────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Auto-inject idempotency key for mutating requests
  if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
    config.headers['X-Idempotency-Key'] =
      config.headers['X-Idempotency-Key'] || generateIdempotencyKey();
  }
  return config;
});

// ─── Response interceptor — normalise errors ─────────────────────────────────
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default apiClient;

// ─── Typed resource helpers (kept in one place, reused everywhere) ───────────
export const buildQuery = (params) => {
  const q = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, v);
  });
  return q.toString() ? `?${q.toString()}` : '';
};
