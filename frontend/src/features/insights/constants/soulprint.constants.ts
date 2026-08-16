import type {
  SoulprintCategory,
  SoulprintSource,
  SoulprintVisibility,
} from '../types/soulprint.types';

export const INSIGHTS_COPY = {
  title: 'Your Soulprint',
  subtitle: 'A living portrait of what makes you, you.',
  completeness: 'Soulprint completeness',
  completenessHint:
    'Add and confirm details to make your insights more useful.',
  summary: 'Your story so far',
  categories: 'Explore your Soulprint',
  pending: 'Review suggestions',
  pendingDescription:
    'Confirm, correct, or dismiss details your coach noticed.',
  noPending: 'You are all caught up.',
  add: 'Add a detail',
  history: 'View history',
  privacy: 'Privacy & visibility',
  recalculate: 'Refresh summary',
  guidance: 'Talk about this with your coach',
  empty: 'Your Soulprint will grow as you share more about yourself.',
  retry: 'Try again',
  loadMore: 'Load more',
  confirm: 'Confirm',
  edit: 'Edit',
  reject: 'Dismiss',
  delete: 'Delete',
  save: 'Save',
  cancel: 'Cancel',
  value: 'What should your Soulprint remember?',
  key: 'Short label (optional)',
  category: 'Category',
  visibility: 'Who can use this?',
  details: 'Soulprint detail',
  evidence: 'Why this was suggested',
  source: 'Source',
  confidence: 'Confidence',
  updated: 'Last updated',
  confirmTitle: 'Confirm this detail?',
  correction: 'Correct it before confirming (optional)',
  deleteTitle: 'Delete this detail?',
  deleteBody:
    'This removes it from your active Soulprint. Its change history is retained.',
  privacyIntro:
    'You control where each detail can be used. Private details stay visible only to you.',
  historyIntro: 'See how your Soulprint has evolved over time.',
  historyEmpty: 'No changes yet.',
  created: 'Detail added.',
  saved: 'Changes saved.',
  removed: 'Detail deleted.',
  confirmed: 'Detail confirmed.',
  rejected: 'Suggestion dismissed.',
} as const;

const labels: Record<SoulprintCategory, [string, string]> = {
  PERSONALITY: ['Personality', 'P'],
  CORE_VALUE: ['Core values', 'V'],
  INTEREST: ['Interests', 'I'],
  RELATIONSHIP_GOAL: ['Relationship goals', 'R'],
  PARTNER_PREFERENCE: ['Partner preferences', 'P'],
  COMMUNICATION_STYLE: ['Communication', 'C'],
  LOVE_LANGUAGE: ['Love languages', 'L'],
  EMOTIONAL_NEED: ['Emotional needs', 'E'],
  BOUNDARY: ['Boundaries', 'B'],
  STRENGTH: ['Strengths', 'S'],
  CHALLENGE: ['Challenges', 'C'],
  DISLIKE: ['Dislikes', 'D'],
  HABIT: ['Habits', 'H'],
  LIFESTYLE: ['Lifestyle', 'L'],
  PAST_EXPERIENCE: ['Past experiences', 'P'],
  RELATIONSHIP_PATTERN: ['Relationship patterns', 'R'],
  DEAL_BREAKER: ['Dealbreakers', '!'],
  IMPORTANT_PERSON: ['Important people', 'P'],
  IMPORTANT_EVENT: ['Important events', 'E'],
  LOCATION_PREFERENCE: ['Location preferences', 'L'],
  FUTURE_PLAN: ['Future plans', 'F'],
  OTHER: ['Other', 'O'],
};
export const SOULPRINT_CATEGORY_META = Object.fromEntries(
  Object.entries(labels).map(([key, [label, icon]]) => [key, { label, icon }]),
) as Record<SoulprintCategory, { label: string; icon: string }>;
export const VISIBILITY_META: Record<
  SoulprintVisibility,
  { label: string; description: string }
> = {
  PRIVATE: { label: 'Private', description: 'Visible only to you.' },
  GUIDANCE_ONLY: {
    label: 'Coach only',
    description: 'May personalize coaching conversations.',
  },
  MATCHING_ALLOWED: {
    label: 'Coach and matching',
    description: 'May be used for coaching and compatible match suggestions.',
  },
};
export const SOURCE_LABELS: Record<SoulprintSource, string> = {
  USER_PROFILE: 'Profile',
  USER_DECLARED: 'Shared by you',
  USER_CONFIRMED: 'Confirmed by you',
  AI_INFERRED: 'Coach conversation',
  MANUAL_USER_ENTRY: 'Added by you',
  SYSTEM_MIGRATION: 'Soulmeet',
};
export const PRIMARY_CATEGORIES: SoulprintCategory[] = [
  'PERSONALITY',
  'CORE_VALUE',
  'INTEREST',
  'RELATIONSHIP_GOAL',
  'EMOTIONAL_NEED',
  'COMMUNICATION_STYLE',
];
export const SOULPRINT_ERROR_MESSAGES: Record<string, string> = {
  SOULPRINT_NOT_FOUND: 'Your Soulprint is not available yet.',
  SOULPRINT_ENTRY_NOT_FOUND: 'This detail no longer exists.',
  ENTRY_NOT_FOUND: 'This detail no longer exists.',
  INVALID_CURSOR: 'This page could not be loaded. Please refresh.',
  SOULPRINT_EXTRACTION_ALREADY_RUNNING:
    'Your Soulprint is already being refreshed.',
  EXTRACTION_ALREADY_RUNNING: 'Your Soulprint is already being refreshed.',
  UNAUTHORIZED: 'Please sign in again.',
  FORBIDDEN: 'You do not have access to this detail.',
};
