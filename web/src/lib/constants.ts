import type { CoachGender, CoachPersonality, DatingGenderPreference, Gender } from '@/types';

export const ALL_COACH_TRAITS: CoachPersonality[] = [
  'FRIENDLY',
  'BRO_VIBE',
  'SISTER_VIBE',
  'FUNNY',
  'CARING',
  'SERIOUS',
  'DIRECT',
  'SOFT',
  'EMPATHETIC',
  'THERAPIST',
  'DATING_EXPERT',
  'PROTECTIVE',
  'SARCASTIC',
  'MORE_DIRECTIVE',
  'LESS_DIRECTIVE',
];

export const COACH_TRAIT_OPTIONS: {
  value: CoachPersonality;
  label: string;
  description: string;
}[] = [
  { value: 'FRIENDLY', label: 'Friendly', description: 'Warm, casual, and easy to talk to.' },
  { value: 'BRO_VIBE', label: 'Bro vibe', description: 'Relaxed, loyal, and straight-talking.' },
  { value: 'SISTER_VIBE', label: 'Sister vibe', description: 'Supportive, honest, and caring.' },
  { value: 'THERAPIST', label: 'Therapist-like', description: 'Reflective listening and thoughtful questions.' },
  { value: 'DATING_EXPERT', label: 'Confident dating expert', description: 'Clear confidence for modern dating.' },
  { value: 'FUNNY', label: 'Funny', description: 'Humor and wit when things feel heavy.' },
  { value: 'SERIOUS', label: 'Serious', description: 'Focused, composed, and intentional.' },
  { value: 'EMPATHETIC', label: 'Empathetic', description: 'Sensitive to feelings and emotional nuance.' },
  { value: 'SARCASTIC', label: 'Sarcastic', description: 'Playful edge with clever honesty.' },
  { value: 'DIRECT', label: 'Direct', description: 'Clear feedback without detours.' },
  { value: 'SOFT', label: 'Soft', description: 'Gentle, patient, and reassuring.' },
  { value: 'CARING', label: 'Caring', description: 'Warm and attentive to how you feel.' },
  { value: 'PROTECTIVE', label: 'Protective', description: 'Looks out for your boundaries and safety.' },
  { value: 'MORE_DIRECTIVE', label: 'More directive', description: 'Proactive advice and concrete next steps.' },
  { value: 'LESS_DIRECTIVE', label: 'Less directive', description: 'More space to reflect and decide yourself.' },
];

export const ONBOARDING_COACH_TRAITS: CoachPersonality[] = [
  'FRIENDLY',
  'BRO_VIBE',
  'SISTER_VIBE',
  'THERAPIST',
  'DATING_EXPERT',
  'FUNNY',
  'SERIOUS',
  'EMPATHETIC',
  'SARCASTIC',
  'DIRECT',
  'SOFT',
  'MORE_DIRECTIVE',
  'LESS_DIRECTIVE',
];

export const COACH_GENDER_OPTIONS: readonly [CoachGender, string][] = [
  ['FEMALE', 'Female'],
  ['MALE', 'Male'],
  ['NON_GENDERED', 'Non-gendered'],
];

export const COACH_APPEARANCE_OPTIONS: readonly [string, string][] = [
  ['warm-female', 'Warm feminine'],
  ['warm-male', 'Warm masculine'],
  ['neutral-ai', 'Neutral'],
];

export const DATING_GENDER_OPTIONS: readonly [DatingGenderPreference, string][] = [
  ['FEMALE', 'Women'],
  ['MALE', 'Men'],
  ['NON_GENDERED', 'Any'],
];

export const PROFILE_GENDER_OPTIONS: readonly [Gender, string][] = [
  ['FEMALE', 'Female'],
  ['MALE', 'Male'],
  ['NON_GENDERED', 'Any'],
];

export const ORIENTATION_OPTIONS: readonly [string, string][] = [
  ['HETEROSEXUAL', 'Heterosexual'],
  ['HOMOSEXUAL', 'Homosexual'],
  ['BISEXUAL', 'Bisexual'],
  ['PANSEXUAL', 'Pansexual'],
  ['ASEXUAL', 'Asexual'],
  ['OTHER', 'Other'],
  ['PREFER_NOT_TO_SAY', 'Prefer not to say'],
];
