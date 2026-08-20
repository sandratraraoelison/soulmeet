import { dispatchUnauthorized } from '@/lib/auth-client';
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/backend${path}`, {
    ...init,
    headers: {
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...init.headers,
    },
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const data = (await response.json().catch(() => null)) as
    { message?: string | string[]; error?: { message?: string } } | T | null;
  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      dispatchUnauthorized();
    }
    const payload = data as { message?: string | string[]; error?: { message?: string } } | null;
    const message = payload?.error?.message ?? payload?.message;
    throw new ApiError(
      Array.isArray(message)
        ? message.join(' ')
        : (message ?? 'Soulmeet could not complete this request.'),
      response.status,
    );
  }
  return data as T;
}
export const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});
