import type { CoachGender } from '@/types';

export interface CoachFaceOption {
  id: string;
  title: string;
  description: string;
  gender: CoachGender;
}

export const COACH_FACES: CoachFaceOption[] = [
  {
    id: 'warm-male',
    title: 'Warm & grounded',
    description: 'A reassuring masculine presence.',
    gender: 'MALE',
  },
  {
    id: 'warm-female',
    title: 'Warm & uplifting',
    description: 'An encouraging feminine presence.',
    gender: 'FEMALE',
  },
  {
    id: 'luminous-guide',
    title: 'Luminous guide',
    description: 'A calm, intuitive presence.',
    gender: 'FEMALE',
  },
  {
    id: 'neutral-ai',
    title: 'Pure AI',
    description: 'A neutral, universal presence.',
    gender: 'NON_GENDERED',
  },
];

export const coachFace = (appearance?: string | null) =>
  COACH_FACES.find((face) => face.id === (appearance ?? 'neutral-ai')) ?? COACH_FACES[3];