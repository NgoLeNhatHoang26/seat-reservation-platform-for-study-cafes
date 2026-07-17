import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../config/api';

let _getAccessToken: (() => string | null) | null = null;
let _setAccessToken: ((token: string | null) => void) | null = null;
let _onRefreshInvalid: (() => void) | null = null;

export function setupAuthCallbacks(
  getToken: () => string | null,
  setToken: (token: string | null) => void,
  onInvalid: () => void,
): void {
  _getAccessToken = getToken;
  _setAccessToken = setToken;
  _onRefreshInvalid = onInvalid;
}

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;

interface QueueEntry {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}

const failedQueue: QueueEntry[] = [];

function processQueue(err: unknown, token: string | null): void {
  failedQueue.splice(0).forEach(({ resolve, reject }) => {
    if (err) reject(err);
    else resolve(token as string);
  });
}

axiosInstance.interceptors.request.use((config) => {
  const token = _getAccessToken?.();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 AUTH_TOKEN_EXPIRED  → POST /auth/refresh → retry original request
// 401 AUTH_REFRESH_TOKEN_INVALID → clear auth + redirect /login

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableConfig | undefined;
    const errorCode = (error.response?.data as { error?: string } | undefined)?.error;

    if (
      error.response?.status === 401 &&
      errorCode === 'AUTH_TOKEN_EXPIRED' &&
      !originalRequest?._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              if (originalRequest) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(axiosInstance(originalRequest));
              }
            },
            reject,
          });
        });
      }

      if (!originalRequest) return Promise.reject(error);

      originalRequest._retry = true;
      isRefreshing = true;

      const storedRefreshToken = localStorage.getItem('refreshToken');

      try {
        // Use plain axios to avoid interceptor recursion
        const { data } = await axios.post<{
          data: { tokens: { accessToken: string; refreshToken: string } };
        }>(`${API_BASE_URL}/auth/refresh`, { refreshToken: storedRefreshToken });

        const newAccessToken = data.data.tokens.accessToken;
        const newRefreshToken = data.data.tokens.refreshToken;

        _setAccessToken?.(newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        _onRefreshInvalid?.();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (
      error.response?.status === 401 &&
      errorCode === 'AUTH_REFRESH_TOKEN_INVALID'
    ) {
      _onRefreshInvalid?.();
    }

    return Promise.reject(error);
  },
);
