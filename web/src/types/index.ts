export type Gender =
  'MALE' | 'FEMALE' | 'NON_BINARY' | 'NON_GENDERED' | 'OTHER' | 'PREFER_NOT_TO_SAY';
export type DatingGenderPreference = 'MALE' | 'FEMALE' | 'NON_GENDERED';
export type CoachGender = 'MALE' | 'FEMALE' | 'NON_GENDERED';
export type CoachPersonality =
  | 'FRIENDLY'
  | 'BRO_VIBE'
  | 'SISTER_VIBE'
  | 'FUNNY'
  | 'CARING'
  | 'SERIOUS'
  | 'DIRECT'
  | 'SOFT'
  | 'EMPATHETIC'
  | 'THERAPIST'
  | 'DATING_EXPERT'
  | 'PROTECTIVE'
  | 'SARCASTIC'
  | 'MORE_DIRECTIVE'
  | 'LESS_DIRECTIVE';
export interface User {
  id: string;
  email: string;
  authProvider: 'EMAIL' | 'GOOGLE' | 'APPLE';
  role: string;
  emailVerified: boolean;
}
export interface Profile {
  id: string;
  userId: string;
  firstName: string;
  birthDate: string;
  gender: Gender;
  sexualOrientation: string;
  interestedInGender: DatingGenderPreference | null;
  country: string;
  city: string;
  occupation?: string | null;
  onboardingCompleted: boolean;
}
export interface Coach {
  id: string;
  name: string;
  gender: CoachGender;
  traits: CoachPersonality[];
  appearance?: string | null;
  customInstructions?: string | null;
  speakingStyle?: string | null;
  adviceStyle?: string | null;
  humorLevel: number;
  empathyLevel: number;
  directnessLevel: number;
  energyLevel: number;
}
export interface GuidanceConversation {
  id: string;
  title: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  lastMessageAt: string | null;
}
export interface GuidanceMessage {
  id: string;
  conversationId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string | null;
  isEdited?: boolean;
  isDeleted: boolean;
  createdAt: string;
}
export type SoulprintVisibility = 'PRIVATE' | 'GUIDANCE_ONLY' | 'MATCHING_ALLOWED';
export interface SoulprintEntry {
  id: string;
  category: string;
  key?: string | null;
  value: unknown;
  status: string;
  visibility: SoulprintVisibility;
  source: string;
  evidence?: { id: string; excerpt?: string | null; createdAt: string }[];
  createdAt: string;
  updatedAt?: string;
  lastObservedAt?: string;
}
export interface SoulprintOverview {
  id: string;
  summary: unknown;
  completenessScore: number;
  pendingConfirmationCount: number;
  entries: SoulprintEntry[];
  updatedAt: string;
}
export interface GrowthGoal {
  id: string;
  title: string;
  description?: string | null;
  targetSteps: number;
  completedSteps: number;
  status: string;
  version: number;
}
export interface GrowthPreference {
  timezone: string;
  remindersEnabled: boolean;
  reminderHour: number;
  analyticsConsent: boolean;
  gentleStreaks: boolean;
}
export interface GrowthOverview {
  activeGoals: GrowthGoal[];
  suggestedGoals: GrowthGoal[];
  todayExercise?: {
    id: string;
    title: string;
    description: string;
    durationMin: number;
    completedAt?: string | null;
  } | null;
  weeklyCheckIn?: {
    id: string;
    mood: number;
    reflection?: string | null;
    updatedAt: string;
  } | null;
  recentActivity: { id: string; type: string; title: string; createdAt: string }[];
  paths: {
    key: string;
    title: string;
    description: string;
    units: number;
    enrollment?: { id: string; completedUnits: number; totalUnits: number } | null;
  }[];
  moodTrend: { id: string; mood: number; updatedAt: string }[];
  preferences: GrowthPreference;
  streak?: number | null;
}
export interface SoulMatch {
  userId: string;
  name: string;
  age: number;
  job: string;
  city: string;
  country: string;
  scoreMin: number;
  scoreMax: number;
  compatibilityType: string;
  personalityDescription: string;
  physicalDescription: string;
  reasons: string[];
  coachInsight: string;
}
export interface MatchDecision {
  userId: string;
  name: string;
  age: number;
  city: string;
  country: string;
  job: string;
  score: number;
  response: 'ACCEPTED' | 'REJECTED';
  respondedAt: string;
}
export type MatchmakingStatus =
  | 'LEARNING'
  | 'READY'
  | 'SEARCHING'
  | 'NO_MATCH_YET'
  | 'MATCH_READY';
export interface MatchmakingOverview {
  status: MatchmakingStatus;
  readiness: { ready: boolean; score: number; missing: string[] };
  matches: SoulMatch[];
}
export interface MatchResponseResult {
  mutual: boolean;
  conversation: { id: string } | null;
}
export interface ChatMessage {
  id: string;
  clientMessageId?: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  type: 'TEXT' | 'IMAGE' | 'AUDIO';
  mediaUrl: string | null;
  status: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  createdAt: string;
}
export interface Conversation {
  id: string;
  participants: { userId: string; user?: { profile?: { firstName: string } | null } }[];
  messages?: ChatMessage[];
  lastMessageAt: string | null;
  unreadCount: number;
}
export interface DiscoverableUser {
  id: string;
  profile: {
    firstName: string;
    birthDate: string;
    city: string;
    country: string;
    occupation?: string | null;
  };
}
export interface PublicProfile {
  id: string;
  profile: {
    firstName: string;
    city: string;
    country: string;
    occupation?: string | null;
    gender: Gender;
    sexualOrientation?: string | null;
    birthDate?: string;
  };
  compatibility: {
    score: number;
    scoreMin: number;
    scoreMax: number;
    compatibilityType: string;
    reasons: string[];
  } | null;
  soulprint: { category: string; value: string; importance: number; shared: boolean }[];
}
