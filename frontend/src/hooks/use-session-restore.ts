import { useEffect } from 'react';
import { authApi } from '@/api/auth.api';
import { tokenStorage } from '@/services/token-storage.service';
import { useAuthStore } from '@/store/auth.store';
import { queryClient } from '@/lib/query-client';

/**
 * Restores the authenticated session from stored tokens, populating the
 * React Query cache and finishing the auth bootstrap. Falls back to an
 * unauthenticated state after a timeout so the app never hangs on restore.
 */
export function useSessionRestore() {
  const finishRestoring = useAuthStore((state) => state.finishRestoring);

  useEffect(() => {
    let active = true;
    let finished = false;
    const finish = (authenticated: boolean) => {
      if (!active || finished) return;
      finished = true;
      finishRestoring(authenticated);
    };
    const timeout = setTimeout(() => finish(false), 6_000);
    void (async () => {
      try {
        const tokens = await tokenStorage.get();
        if (!tokens.accessToken || !tokens.refreshToken) return finish(false);
        const user = await authApi.me();
        if (finished) return;
        queryClient.setQueryData(['me'], user);
        finish(true);
      } catch {
        void tokenStorage.clear();
        finish(false);
      }
    })();
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [finishRestoring]);
}
