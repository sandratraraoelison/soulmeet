export const SOULPRINT_CATEGORIES = [
  'PERSONALITY', 'CORE_VALUE', 'INTEREST', 'RELATIONSHIP_GOAL', 'PARTNER_PREFERENCE',
  'COMMUNICATION_STYLE', 'LOVE_LANGUAGE', 'EMOTIONAL_NEED', 'BOUNDARY', 'STRENGTH',
  'CHALLENGE', 'DISLIKE', 'HABIT', 'LIFESTYLE', 'PAST_EXPERIENCE', 'RELATIONSHIP_PATTERN',
  'DEAL_BREAKER', 'IMPORTANT_PERSON', 'IMPORTANT_EVENT', 'LOCATION_PREFERENCE', 'FUTURE_PLAN', 'OTHER',
] as const;
export type SoulprintCategory = (typeof SOULPRINT_CATEGORIES)[number];
export type SoulprintSource = 'USER_PROFILE' | 'USER_DECLARED' | 'USER_CONFIRMED' | 'AI_INFERRED' | 'MANUAL_USER_ENTRY' | 'SYSTEM_MIGRATION';
export type SoulprintStatus = 'PENDING_CONFIRMATION' | 'ACTIVE' | 'CONFIRMED' | 'REJECTED' | 'SUPERSEDED' | 'DELETED';
export type SoulprintVisibility = 'PRIVATE' | 'GUIDANCE_ONLY' | 'MATCHING_ALLOWED';
export type SoulprintSensitivity = 'NORMAL' | 'PERSONAL' | 'SENSITIVE' | 'HIGHLY_SENSITIVE';

export interface SoulprintEvidence { id: string; excerpt?: string | null; createdAt: string }
export interface SoulprintEntry {
  id: string; category: SoulprintCategory; key?: string | null; value: unknown;
  source: SoulprintSource; status: SoulprintStatus; visibility: SoulprintVisibility;
  sensitivity: SoulprintSensitivity; confidence?: number | null; importance?: number | null;
  matchingWeight?: number | null; evidence?: SoulprintEvidence[]; firstObservedAt?: string; lastObservedAt?: string; confirmedAt?: string | null; createdAt: string; updatedAt: string;
}
export interface SoulprintOverview {
  id: string; summary: unknown; completenessScore: number; pendingConfirmationCount: number;
  entries: SoulprintEntry[]; lastSummarizedAt?: string | null; updatedAt: string;
}
export interface SoulprintSummary { summary: unknown; completenessScore: number; version: number }
export interface CursorPage<T> { entries: T[]; nextCursor: string | null }
export interface SoulprintChange {
  id: string; entryId: string; changeType: string; previousValue?: unknown; newValue?: unknown;
  changedBy: string; reason?: string | null; createdAt: string;
}
export interface HistoryPage { changes: SoulprintChange[]; nextCursor: string | null }
export interface SoulprintExtractionStatus {
  status: 'IDLE' | 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  attempts: number; runAt?: string; completedAt?: string | null; lastErrorCode?: string | null;
}
export interface EntryFilters {
  category?: SoulprintCategory; status?: SoulprintStatus; source?: SoulprintSource;
  visibility?: SoulprintVisibility; sensitivity?: SoulprintSensitivity; limit?: number;
}
export interface EntryInput {
  category: SoulprintCategory; key?: string; value: unknown; visibility?: SoulprintVisibility;
  sensitivity?: SoulprintSensitivity; importance?: number; matchingWeight?: number;
}
export type EntryUpdate = Partial<EntryInput>;
