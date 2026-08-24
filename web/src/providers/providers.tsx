'use client';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { listenUnauthorized } from '@/lib/auth-client';
import { showToast, ToastViewport } from '@/components/ui/toast';
export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [client] = useState(
    () =>
      new QueryClient({
        mutationCache: new MutationCache({
          onSuccess: (_data, _variables, _context, mutation) => {
            const message = mutation.meta?.successMessage;
            if (typeof message === 'string') showToast('success', message);
          },
          onError: (error, _variables, _context, mutation) => {
            if (!mutation.meta?.errorMessage) return;
            const fallback = typeof mutation.meta.errorMessage === 'string' ? mutation.meta.errorMessage : 'Something went wrong. Please try again.';
            showToast('error', error instanceof Error && error.message ? error.message : fallback);
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 10 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: { retry: 0 },
        },
      }),
  );
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = localStorage.getItem('sm_theme') ?? 'dark';
    const style = localStorage.getItem('sm_style');
    if (style === 'soft' || style === 'bold' || style === 'balanced') root.dataset.style = style;
  }, []);
  const redirecting = useRef(false);
  useEffect(() => {
    const off = listenUnauthorized(() => {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/login') || pathname.startsWith('/register')) return;
      if (redirecting.current) return;
      redirecting.current = true;
      const current = pathname + window.location.search;
      const next = current === '/' ? '' : `?next=${encodeURIComponent(current)}`;
      router.replace(`/login${next}`);
    });
    return off;
  }, [router]);
  return <QueryClientProvider client={client}>{children}<ToastViewport /></QueryClientProvider>;
}
