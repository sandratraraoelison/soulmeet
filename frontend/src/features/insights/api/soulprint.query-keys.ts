import type { EntryFilters } from '../types/soulprint.types';
// Hierarchical keys allow one mutation to invalidate either a precise view or
// the complete Soulprint cache family without touching unrelated app state.
export const soulprintKeys = {
  all: ['soulprint'] as const,
  overview: () => [...soulprintKeys.all, 'overview'] as const,
  summary: () => [...soulprintKeys.all, 'summary'] as const,
  entries: () => [...soulprintKeys.all, 'entries'] as const,
  entryList: (filters: EntryFilters) =>
    [...soulprintKeys.entries(), filters] as const,
  entry: (entryId: string) =>
    [...soulprintKeys.entries(), 'detail', entryId] as const,
  pending: () => [...soulprintKeys.all, 'pending'] as const,
  history: () => [...soulprintKeys.all, 'history'] as const,
  extractionStatus: () => [...soulprintKeys.all, 'extraction-status'] as const,
};
