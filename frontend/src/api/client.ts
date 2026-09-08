import {
  AxiosError,
  create,
  InternalAxiosRequestConfig,
  isAxiosError,
} from 'axios';
import { diag } from '@/lib/diag';
import { tokenStorage } from '@/services/token-storage.service';
import { useAuthStore } from '@/store/auth.store';
import type { Tokens } from '@/types/models';

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  'https://soulmeet-backend.onrender.com/api/v1';
export const apiClient = create({ baseURL: API_URL, timeout: 12_000 });
const refreshClient = create({ baseURL: API_URL, timeout: 12_000 });
let refreshPromise: Promise<string> | null = null;

const isTracked = (url?: string) =>
  Boolean(url && /^\/(auth|profile|coach)/.test(url));

apiClient.interceptors.request.use(async (config) => {
  const { accessToken } = await tokenStorage.get();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  if (isTracked(config.url))
    diag.log(`REQ ${config.method?.toUpperCase()} ${config.url} token=${Boolean(accessToken)}`);
  return config;
});

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}
apiClient.interceptors.response.use(
  (response) => {
    if (isTracked(response.config?.url))
      diag.log(`RESP ${response.config.method?.toUpperCase()} ${response.config?.url} status=${response.status}`);
    return response;
  },
  async (error: AxiosError) => {
    const request = error.config as RetryConfig | undefined;
    if (isTracked(request?.url))
      diag.error(`RESP-ERROR ${request?.method?.toUpperCase()} ${request?.url} status=${error.response?.status} code=${error.code} msg=${error.message}`);
    if (
      error.response?.status !== 401 ||
      !request ||
      request._retry ||
      request.url?.includes('/auth/refresh')
    )
      return Promise.reject(error);
    request._retry = true;
    diag.log('REFRESH start (401 on', request.url, ')');
    try {
      refreshPromise ??= (async () => {
        const { refreshToken } = await tokenStorage.get();
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await refreshClient.post<Tokens>('/auth/refresh', {
          refreshToken,
        });
        await tokenStorage.save(data);
        return data.accessToken;
      })().finally(() => {
        refreshPromise = null;
      });
      diag.log('REFRESH OK, retrying', request.url);
      request.headers.Authorization = `Bearer ${await refreshPromise}`;
      return apiClient.request(request);
    } catch (refreshError) {
      diag.error('REFRESH FAILED', refreshError);
      // A network error while refreshing must not destroy the stored session:
      // the tokens are still valid server-side, so keep them for a later retry
      // and let the caller surface the transient failure.
      if (!isAxiosError(refreshError) || !refreshError.response) {
        return Promise.reject(refreshError);
      }
      await tokenStorage.clear();
      useAuthStore.getState().reset();
      return Promise.reject(refreshError);
    }
  },
);

export function getErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return 'Something went wrong. Please try again.';
  if (error.code === 'ECONNABORTED')
    return 'The request took too long. Please try again.';
  if (!error.response) return 'Cannot reach Soulmeet. Check your connection.';
  const payload = error.response.data as {
    error?: string | { message?: string | string[] };
    message?: string | string[];
  };
  const detail =
    typeof payload?.error === 'object'
      ? payload.error.message
      : (payload?.message ?? payload?.error);
  return Array.isArray(detail)
    ? (detail[0] ?? 'Invalid information.')
    : (detail ?? 'The server could not complete your request.');
}
