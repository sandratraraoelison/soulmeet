'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { listenUnauthorized } from '@/lib/auth-client';
export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [client] = useState(
    () =>
      new QueryClient({
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
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
