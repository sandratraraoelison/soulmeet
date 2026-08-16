export type GrowthGoalStatus = 'SUGGESTED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
export interface GrowthGoal { id: string; title: string; description?: string | null; targetSteps: number; completedSteps: number; status: GrowthGoalStatus; targetDate?: string | null; source: string; version: number; completedAt?: string | null }
export interface GrowthExercise { id: string; goalId?: string | null; kind: string; title: string; description: string; durationMin: number; note?: string | null; completedAt?: string | null }
export interface GrowthCheckIn { id: string; mood: number; reflection?: string | null; updatedAt: string }
export interface GrowthActivity { id: string; type: string; title: string; createdAt: string }
export interface GrowthPreference { timezone: string; remindersEnabled: boolean; reminderHour: number; analyticsConsent: boolean; gentleStreaks: boolean }
export interface GrowthPath { key: string; title: string; description: string; units: number; enrollment?: { id: string; completedUnits: number; totalUnits: number } | null }
export interface GrowthOverview { activeGoals: GrowthGoal[]; suggestedGoals: GrowthGoal[]; todayExercise: GrowthExercise; weeklyCheckIn?: GrowthCheckIn | null; recentActivity: GrowthActivity[]; paths: GrowthPath[]; moodTrend: Pick<GrowthCheckIn, 'id' | 'mood' | 'updatedAt'>[]; preferences: GrowthPreference; streak?: number | null }
export interface CreateGrowthGoalInput { title: string; description?: string; targetSteps?: number; targetDate?: string }
export interface GrowthCheckInInput { mood: number; reflection?: string }
