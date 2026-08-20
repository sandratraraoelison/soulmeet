import { api } from './api';
import type { SoulprintEntry, SoulprintOverview } from '@/types';

export type SoulprintPage = { entries: SoulprintEntry[]; nextCursor: string | null };
export type SoulprintHistoryChange = {
  id: string;
  entryId: string;
  changeType: string;
  changedBy: string;
  reason?: string | null;
  createdAt: string;
  previousValue?: unknown;
  newValue?: unknown;
};
export type SoulprintHistory = {
  changes: SoulprintHistoryChange[];
  nextCursor: string | null;
};
export type SoulprintSummary = { summary: unknown; completenessScore: number; version: number };
export type ExtractionStatus = {
  status: 'IDLE' | 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  attempts: number;
};

export const soulprintService = {
  overview: () => api<SoulprintOverview>('/soulprint'),
  entries: () => api<SoulprintPage>('/soulprint/entries?limit=100'),
  pending: () => api<SoulprintPage>('/soulprint/pending?limit=100'),
  summary: () => api<SoulprintSummary>('/soulprint/summary'),
  history: () => api<SoulprintHistory>('/soulprint/history?limit=20'),
  extractionStatus: () => api<ExtractionStatus>('/soulprint/extraction-status'),
};
