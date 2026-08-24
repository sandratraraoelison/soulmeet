export type CompatibilityType = 'Safe Compatibility' | 'Passionate Compatibility' | 'Healing Compatibility' | 'Growth Compatibility' | 'Long-Term Compatibility';

export interface SoulMatch {
  userId: string;
  name: string;
  age: number;
  job: string;
  city: string;
  country: string;
  score: number;
  scoreMin: number;
  scoreMax: number;
  reciprocalScore: number;
  reciprocalScoreMin: number;
  compatibilityType: CompatibilityType;
  physicalDescription: string;
  personalityDescription: string;
  reasons: string[];
  impression: string;
  persona: string;
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

export type MatchmakingStatus = 'LEARNING' | 'READY' | 'SEARCHING' | 'NO_MATCH_YET' | 'MATCH_READY';

export interface MatchmakingReadiness {
  ready: boolean;
  score: number;
  missing: string[];
}

export interface MatchmakingOverview {
  status: MatchmakingStatus;
  readiness: MatchmakingReadiness;
  matches: SoulMatch[];
}

export interface MatchResponseResult {
  mutual: boolean;
  conversation: { id: string } | null;
}
