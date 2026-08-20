import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SoulMatch } from '../types/soul.types';
import { soulApi } from '../api/soul.api';
export const useSoulMatches = () => useQuery({ queryKey: ['soul', 'matches'], queryFn: soulApi.matches });
export const useMatchHistory = () => useQuery({ queryKey: ['soul', 'match-history'], queryFn: soulApi.history });

export const useRespondSoulMatch = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, response }: { userId: string; response: 'ACCEPTED' | 'REJECTED' }) =>
      soulApi.respond(userId, response),
    onSuccess: (_result, variables) => {
      client.setQueryData<SoulMatch[]>(['soul', 'matches'], (matches) =>
        matches?.filter((match) => match.userId !== variables.userId),
      );
      void client.invalidateQueries({ queryKey: ['soul', 'match-history'] });
    },
  });
};
