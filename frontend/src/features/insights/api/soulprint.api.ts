import { isAxiosError } from 'axios';
import { apiClient } from '@/api/client';
import { SOULPRINT_ERROR_MESSAGES } from '../constants/soulprint.constants';
import type {
  CursorPage,
  EntryFilters,
  EntryInput,
  EntryUpdate,
  HistoryPage,
  SoulprintEntry,
  SoulprintExtractionStatus,
  SoulprintOverview,
  SoulprintSummary,
  SoulprintVisibility,
} from '../types/soulprint.types';

// Keep pagination serialization in one place so every filtered list uses the
// same default page size and cursor contract.
const cursorParams = (filters: EntryFilters, cursor?: string) => ({
  ...filters,
  limit: filters.limit ?? 20,
  cursor,
});
export const soulprintApi = {
  getOverview: async () =>
    (await apiClient.get<SoulprintOverview>('/soulprint')).data,
  getSummary: async () =>
    (await apiClient.get<SoulprintSummary>('/soulprint/summary')).data,
  getEntries: async (filters: EntryFilters = {}, cursor?: string) =>
    (
      await apiClient.get<CursorPage<SoulprintEntry>>('/soulprint/entries', {
        params: cursorParams(filters, cursor),
      })
    ).data,
  getEntry: async (id: string) =>
    (await apiClient.get<SoulprintEntry>(`/soulprint/entries/${id}`)).data,
  createEntry: async (input: EntryInput) =>
    (await apiClient.post<SoulprintEntry>('/soulprint/entries', input)).data,
  updateEntry: async (id: string, input: EntryUpdate) =>
    (await apiClient.patch<SoulprintEntry>(`/soulprint/entries/${id}`, input))
      .data,
  deleteEntry: async (id: string) => {
    await apiClient.delete(`/soulprint/entries/${id}`);
  },
  confirmEntry: async (id: string, correctedValue?: unknown) =>
    (
      await apiClient.post<SoulprintEntry>(
        `/soulprint/entries/${id}/confirm`,
        correctedValue === undefined ? {} : { correctedValue },
      )
    ).data,
  rejectEntry: async (id: string) =>
    (await apiClient.post<SoulprintEntry>(`/soulprint/entries/${id}/reject`))
      .data,
  updateVisibility: async (id: string, visibility: SoulprintVisibility) =>
    (
      await apiClient.patch<SoulprintEntry>(
        `/soulprint/entries/${id}/visibility`,
        { visibility },
      )
    ).data,
  getPending: async (cursor?: string) =>
    (
      await apiClient.get<CursorPage<SoulprintEntry>>('/soulprint/pending', {
        params: { cursor, limit: 20 },
      })
    ).data,
  getHistory: async (cursor?: string) =>
    (
      await apiClient.get<HistoryPage>('/soulprint/history', {
        params: { cursor, limit: 20 },
      })
    ).data,
  getExtractionStatus: async () =>
    (await apiClient.get<SoulprintExtractionStatus>('/soulprint/extraction-status')).data,
  recalculate: async () =>
    (await apiClient.post<SoulprintOverview>('/soulprint/recalculate')).data,
};

export function getSoulprintErrorMessage(error: unknown): string {
  // Prefer stable backend codes for friendly copy, but retain a safe fallback
  // for transport errors and future server versions.
  if (!isAxiosError(error))
    return error instanceof Error
      ? error.message
      : 'Something went wrong. Please try again.';
  const body = error.response?.data as
    | {
        error?: { code?: string; message?: string };
        code?: string;
        message?: string | string[];
      }
    | undefined;
  const code = body?.error?.code ?? body?.code;
  if (code && SOULPRINT_ERROR_MESSAGES[code])
    return SOULPRINT_ERROR_MESSAGES[code];
  const message = body?.error?.message ?? body?.message;
  return Array.isArray(message)
    ? message.join(' ')
    : (message ?? 'Unable to update your Soulprint. Please try again.');
}

export function displayValue(value: unknown): string {
  // Never render arbitrary objects directly in React Native. Legacy JSON values
  // are serialized deterministically until the user edits them into text.
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(displayValue).join(', ');
  if (value && typeof value === 'object')
    return Object.entries(value)
      .map(([key, item]) => `${key}: ${displayValue(item)}`)
      .join(' · ');
  return String(value ?? '');
}
