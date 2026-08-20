'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { User } from '@/types';

const MeContext = createContext<UseQueryResult<User> | null>(null);

export function MeProvider({ children }: { children: ReactNode }) {
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<User>('/auth/me') });
  return <MeContext.Provider value={me}>{children}</MeContext.Provider>;
}

export function useMeQuery(): UseQueryResult<User> {
  const me = useContext(MeContext);
  if (!me) throw new Error('useMeQuery must be used within a MeProvider');
  return me;
}