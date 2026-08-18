export type AuthProvider = 'EMAIL' | 'GOOGLE' | 'APPLE';
export type Gender = 'MALE' | 'FEMALE' | 'NON_GENDERED';
export type SexualOrientation =
  | 'HETEROSEXUAL'
  | 'HOMOSEXUAL'
  | 'BISEXUAL'
  | 'PANSEXUAL'
  | 'ASEXUAL'
  | 'OTHER'
  | 'PREFER_NOT_TO_SAY';
export type CoachGender = 'MALE' | 'FEMALE' | 'NON_GENDERED';
export type InterestGender = CoachGender;
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
export interface Tokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
}
export interface User {
  id: string;
  email: string;
  authProvider: AuthProvider;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  emailVerified: boolean;
}
export interface Profile {
  id: string;
  userId: string;
  firstName: string;
  birthDate: string;
  gender: Gender;
  sexualOrientation: SexualOrientation;
  interestedInGender?: InterestGender | null;
  country: string;
  city: string;
  occupation?: string | null;
  onboardingCompleted: boolean;
}
export interface Coach {
  id: string;
  userId: string;
  name: string;
  gender: CoachGender;
  personality?: CoachPersonality | null;
  traits: CoachPersonality[];
  customInstructions?: string | null;
  speakingStyle?: string | null;
  adviceStyle?: string | null;
  appearance?: string | null;
  humorLevel: number;
  empathyLevel: number;
  directnessLevel: number;
  energyLevel: number;
}
export interface ProfileInput {
  firstName: string;
  birthDate: string;
  gender: Gender;
  sexualOrientation: SexualOrientation;
  country: string;
  city: string;
  occupation?: string;
  interestedInGender?: InterestGender;
}
export interface CoachInput {
  name: string;
  gender: CoachGender;
  traits: CoachPersonality[];
  personality?: CoachPersonality;
  customInstructions?: string;
  speakingStyle?: string;
  adviceStyle?: string;
  appearance?: string;
  humorLevel?: number;
  empathyLevel?: number;
  directnessLevel?: number;
  energyLevel?: number;
}
