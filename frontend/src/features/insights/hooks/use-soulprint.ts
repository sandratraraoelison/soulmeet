import { InfiniteData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { soulprintApi } from '../api/soulprint.api';
import { soulprintKeys } from '../api/soulprint.query-keys';
import type { CursorPage, EntryFilters, EntryInput, EntryUpdate, SoulprintEntry, SoulprintVisibility } from '../types/soulprint.types';

export const useSoulprint = () => useQuery({ queryKey: soulprintKeys.overview(), queryFn: soulprintApi.getOverview });
export const useSoulprintSummary = () => useQuery({ queryKey: soulprintKeys.summary(), queryFn: soulprintApi.getSummary });
// Poll quickly only while background work is active. The slower idle interval
// still detects work initiated by another device without excessive requests.
export const useSoulprintExtractionStatus = () => useQuery({
  queryKey: soulprintKeys.extractionStatus(), queryFn: soulprintApi.getExtractionStatus,
  refetchInterval: (query) => ['PENDING', 'RUNNING'].includes(query.state.data?.status ?? '') ? 2_000 : 10_000,
});
export const useSoulprintEntry = (id: string) => useQuery({ queryKey: soulprintKeys.entry(id), queryFn: () => soulprintApi.getEntry(id), enabled: Boolean(id) });
export const useSoulprintEntries = (filters: EntryFilters = {}) => useInfiniteQuery({
  queryKey: soulprintKeys.entryList(filters), initialPageParam: undefined as string | undefined,
  queryFn: ({ pageParam }) => soulprintApi.getEntries(filters, pageParam), getNextPageParam: (page) => page.nextCursor ?? undefined,
});
export const usePendingSoulprint = () => useInfiniteQuery({
  queryKey: soulprintKeys.pending(), initialPageParam: undefined as string | undefined,
  queryFn: ({ pageParam }) => soulprintApi.getPending(pageParam), getNextPageParam: (page) => page.nextCursor ?? undefined,
});
export const useSoulprintHistory = () => useInfiniteQuery({
  queryKey: soulprintKeys.history(), initialPageParam: undefined as string | undefined,
  queryFn: ({ pageParam }) => soulprintApi.getHistory(pageParam), getNextPageParam: (page) => page.nextCursor ?? undefined,
});

function replaceEntry(data: InfiniteData<CursorPage<SoulprintEntry>> | undefined, entry: SoulprintEntry) {
  if (!data) return data;
  return { ...data, pages: data.pages.map((page) => ({ ...page, entries: page.entries.map((item) => item.id === entry.id ? entry : item) })) };
}

/**
 * Shared mutation lifecycle for entry-level actions.
 *
 * It snapshots every Soulprint cache before applying an optimistic patch, then
 * restores all snapshots on failure and invalidates derived views on settle.
 */
function useEntryMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<SoulprintEntry>, getId: (variables: TVariables) => string, optimisticPatch?: (variables: TVariables) => Partial<SoulprintEntry>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      await client.cancelQueries({ queryKey: soulprintKeys.all });
      // A visibility/status change can appear in several filtered infinite
      // lists, so rollback must preserve the whole query family.
      const snapshots = client.getQueriesData({ queryKey: soulprintKeys.all });
      const id = getId(variables);
      const patch = optimisticPatch?.(variables);
      if (patch) {
        client.setQueryData<SoulprintEntry>(soulprintKeys.entry(id), (entry) => entry ? { ...entry, ...patch } : entry);
        client.setQueriesData<InfiniteData<CursorPage<SoulprintEntry>>>({ queryKey: soulprintKeys.entries() }, (data) => data ? ({ ...data, pages: data.pages.map((page) => ({ ...page, entries: page.entries.map((entry) => entry.id === id ? { ...entry, ...patch } : entry) })) }) : data);
        client.setQueryData<InfiniteData<CursorPage<SoulprintEntry>>>(soulprintKeys.pending(), (data) => data ? ({ ...data, pages: data.pages.map((page) => ({ ...page, entries: page.entries.flatMap((entry) => entry.id !== id ? [entry] : patch.status && patch.status !== 'PENDING_CONFIRMATION' ? [] : [{ ...entry, ...patch }]) })) }) : data);
      }
      return { snapshots, id };
    },
    onError: (_error, _variables, context) => context?.snapshots.forEach(([key, value]) => client.setQueryData(key, value)),
    onSuccess: (entry) => {
      client.setQueryData(soulprintKeys.entry(entry.id), entry);
      client.setQueriesData<InfiniteData<CursorPage<SoulprintEntry>>>({ queryKey: soulprintKeys.entries() }, (data) => replaceEntry(data, entry));
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: soulprintKeys.overview() });
      void client.invalidateQueries({ queryKey: soulprintKeys.summary() });
      void client.invalidateQueries({ queryKey: soulprintKeys.entries() });
      void client.invalidateQueries({ queryKey: soulprintKeys.pending() });
      void client.invalidateQueries({ queryKey: soulprintKeys.history() });
    },
  });
}

export function useCreateSoulprintEntry() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: EntryInput) => soulprintApi.createEntry(input), onSuccess: (entry) => {
    client.setQueryData(soulprintKeys.entry(entry.id), entry);
    void client.invalidateQueries({ queryKey: soulprintKeys.overview() });
    void client.invalidateQueries({ queryKey: soulprintKeys.entries() });
    void client.invalidateQueries({ queryKey: soulprintKeys.history() });
  } });
}
export const useUpdateSoulprintEntry = () => useEntryMutation(({ id, input }: { id: string; input: EntryUpdate }) => soulprintApi.updateEntry(id, input), ({ id }) => id, ({ input }) => input);
export const useConfirmSoulprintEntry = () => useEntryMutation(({ id, correctedValue }: { id: string; correctedValue?: unknown }) => soulprintApi.confirmEntry(id, correctedValue), ({ id }) => id, ({ correctedValue }) => ({ status: 'CONFIRMED', ...(correctedValue === undefined ? {} : { value: correctedValue }) }));
export const useRejectSoulprintEntry = () => useEntryMutation((id: string) => soulprintApi.rejectEntry(id), (id) => id, () => ({ status: 'REJECTED' }));
export const useSoulprintVisibility = () => useEntryMutation(({ id, visibility }: { id: string; visibility: SoulprintVisibility }) => soulprintApi.updateVisibility(id, visibility), ({ id }) => id, ({ visibility }) => ({ visibility }));

export function useDeleteSoulprintEntry() {
  const client = useQueryClient();
  return useMutation({ mutationFn: soulprintApi.deleteEntry, onSuccess: (_data, id) => {
    client.removeQueries({ queryKey: soulprintKeys.entry(id) });
    client.setQueriesData<InfiniteData<CursorPage<SoulprintEntry>>>({ queryKey: soulprintKeys.entries() }, (data) => data ? ({ ...data, pages: data.pages.map((page) => ({ ...page, entries: page.entries.filter((entry) => entry.id !== id) })) }) : data);
  }, onSettled: () => {
    void client.invalidateQueries({ queryKey: soulprintKeys.overview() });
    void client.invalidateQueries({ queryKey: soulprintKeys.entries() });
    void client.invalidateQueries({ queryKey: soulprintKeys.history() });
  } });
}
export function useRecalculateSoulprint() {
  const client = useQueryClient();
  return useMutation({ mutationFn: soulprintApi.recalculate, onSuccess: (overview) => {
    client.setQueryData(soulprintKeys.overview(), overview);
    void client.invalidateQueries({ queryKey: soulprintKeys.summary() });
  } });
}
