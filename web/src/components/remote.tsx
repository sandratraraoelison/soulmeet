'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export function useRemote<T>(key: string, path: string) {
  return useQuery({ queryKey: [key], queryFn: () => api<T>(path) });
}

export function Loading() {
  return (
    <div className="stack" aria-label="Loading" aria-busy="true">
      <div className="skeleton" style={{ height: 48 }} />
      <div className="skeleton" style={{ height: 160 }} />
      <div className="skeleton" style={{ height: 120 }} />
    </div>
  );
}

export function Failure({ retry }: { retry: () => void }) {
  return (
    <div className="panel card">
      <p className="error">We could not load this right now.</p>
      <button className="button secondary" onClick={retry}>
        Try again
      </button>
    </div>
  );
}
