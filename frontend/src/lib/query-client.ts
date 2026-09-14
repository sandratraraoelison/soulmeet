import { MutationCache, QueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '@/api/client';
import { showToast } from '@/store/toast.store';

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: (_data, _variables, _context, mutation) => {
      if (typeof mutation.meta?.successMessage === 'string') showToast('success', mutation.meta.successMessage);
    },
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.errorMessage) showToast('error', getErrorMessage(error));
    },
  }),
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});
