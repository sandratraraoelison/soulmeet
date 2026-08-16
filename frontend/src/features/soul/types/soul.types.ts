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
  mutualRecommendation: boolean;
  compatibilityType: CompatibilityType;
  physicalDescription: string;
  personalityDescription: string;
  reasons: string[];
  impression: string;
  persona: string;
  coachInsight: string;
}
