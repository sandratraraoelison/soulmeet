'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';
import { ToastProvider } from '@/components/toast';
export function Providers({ children }: { children: React.ReactNode }) { const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } })); return <ThemeProvider attribute="data-theme"><QueryClientProvider client={client}><ToastProvider>{children}</ToastProvider></QueryClientProvider></ThemeProvider>; }
