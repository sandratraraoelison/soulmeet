'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, json } from '@/services/api';

export function useGenericMutation(
  queryKeys: unknown[][],
  options: { onSuccess?: () => void } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Changes saved.', errorMessage: true },
    mutationFn: ({ path, method = 'POST', body = {} }: { path: string; method?: string; body?: unknown }) =>
      api(path, json(method, body)),
    onSuccess: () => {
      queryKeys.forEach((key) => void qc.invalidateQueries({ queryKey: key }));
      options.onSuccess?.();
    },
  });
}
