import { SoulprintCategory, SoulprintSensitivity, SoulprintVisibility } from '@prisma/client';

export interface ExtractedSoulprintEntry {
  category: SoulprintCategory;
  key?: string;
  value: string;
  normalizedValue?: string;
  source: 'USER_DECLARED' | 'AI_INFERRED';
  confidence: number;
  importance: number;
  sensitivity: SoulprintSensitivity;
  suggestedVisibility: SoulprintVisibility;
  reasoning?: string;
  evidenceMessageIds: string[];
}
export interface SoulprintExtractionResult {
  entries: ExtractedSoulprintEntry[];
  contradictions: Array<{ existingEntryId: string; category: SoulprintCategory; newValue: string; explanation: string; evidenceMessageIds: string[] }>;
  summaryUpdateNeeded: boolean;
}
export interface SoulprintSummary {
  overview: string; personality: string[]; coreValues: string[]; interests: string[]; relationshipGoals: string[];
  communicationStyle: string[]; emotionalNeeds: string[]; boundaries: string[]; strengths: string[]; challenges: string[];
  partnerPreferences: string[];
}
export interface SoulprintGuidanceContext {
  summary?: string;
  confirmedFacts: Array<{ category: SoulprintCategory; value: string; importance: number }>;
  declaredFacts: Array<{ category: SoulprintCategory; value: string; importance: number }>;
  tentativeInsights: Array<{ category: SoulprintCategory; value: string; confidence: number }>;
}
export interface SoulprintMatchingProfile {
  userId: string; relationshipGoals: string[]; coreValues: string[]; interests: string[]; communicationStyles: string[];
  partnerPreferences: string[]; boundaries: string[]; dealBreakers: string[]; lifestylePreferences: string[]; locationPreferences: string[];
}
