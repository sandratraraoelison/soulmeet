import type { CoachGender } from '@/types/models';

export interface CoachFaceOption {
  id: string;
  title: string;
  description: string;
  gender: CoachGender;
  index: number;
}

export const COACH_FACES: CoachFaceOption[] = [
  { id: 'warm-male', title: 'Warm & grounded', description: 'A reassuring masculine presence.', gender: 'MALE', index: 0 },
  { id: 'warm-female', title: 'Warm & uplifting', description: 'An encouraging feminine presence.', gender: 'FEMALE', index: 1 },
  { id: 'luminous-guide', title: 'Luminous guide', description: 'A calm, intuitive presence.', gender: 'FEMALE', index: 2 },
  { id: 'neutral-ai', title: 'Pure AI', description: 'A neutral, universal presence.', gender: 'NON_GENDERED', index: 3 },
];

export const coachFace = (appearance?: string | null) =>
  COACH_FACES.find((face) => face.id === (appearance ?? 'neutral-ai')) ?? COACH_FACES[3];
