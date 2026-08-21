import type { CoachGender } from '@/types/models';

export interface CoachFaceOption {
  id: string; title: string; description: string; gender: CoachGender; index: number;
  category: 'Men' | 'Women' | 'Fun';
}

export const COACH_FACES: CoachFaceOption[] = [
  { id: 'malik', title: 'Warm & upbeat', description: 'Quick to help you see the good in yourself.', gender: 'MALE', index: 0, category: 'Men' },
  { id: 'kenji', title: 'Calm & thoughtful', description: 'Has a talent for making things feel simpler.', gender: 'MALE', index: 1, category: 'Men' },
  { id: 'arjun', title: 'Insightful & grounded', description: 'Uses gentle questions that help you go deeper.', gender: 'MALE', index: 2, category: 'Men' },
  { id: 'theo', title: 'Friendly & honest', description: 'Reassuring when your mind starts racing.', gender: 'MALE', index: 3, category: 'Men' },
  { id: 'sami', title: 'Patient & perceptive', description: 'A steady, caring presence that notices the details.', gender: 'MALE', index: 4, category: 'Men' },
  { id: 'mateo', title: 'Relaxed & encouraging', description: 'Brings warmth and a little humor.', gender: 'MALE', index: 5, category: 'Men' },
  { id: 'amara', title: 'Bright & uplifting', description: 'Always in your corner without judging.', gender: 'FEMALE', index: 6, category: 'Women' },
  { id: 'mei', title: 'Serene & attentive', description: 'Helps you hear what you really feel.', gender: 'FEMALE', index: 7, category: 'Women' },
  { id: 'priya', title: 'Curious & insightful', description: 'Gently notices the patterns you might miss.', gender: 'FEMALE', index: 8, category: 'Women' },
  { id: 'clara', title: 'Kind & direct', description: 'Brings clarity without ever feeling cold.', gender: 'FEMALE', index: 9, category: 'Women' },
  { id: 'layla', title: 'Confident & caring', description: 'Helps you trust your own boundaries.', gender: 'FEMALE', index: 10, category: 'Women' },
  { id: 'sofia', title: 'Joyful & open-hearted', description: 'Offers a naturally optimistic energy.', gender: 'FEMALE', index: 11, category: 'Women' },
  { id: 'nova', title: 'Cosmic guide', description: 'An intuitive visitor from somewhere kinder in the universe.', gender: 'NON_GENDERED', index: 12, category: 'Fun' },
  { id: 'buddy', title: 'Loyal companion', description: 'Cheerful and always genuinely excited to listen.', gender: 'NON_GENDERED', index: 13, category: 'Fun' },
  { id: 'miso', title: 'Curious observer', description: 'Quietly convinced that you deserve better.', gender: 'NON_GENDERED', index: 14, category: 'Fun' },
  { id: 'lumen', title: 'Pure AI', description: 'A calm, neutral presence shaped by light and empathy.', gender: 'NON_GENDERED', index: 15, category: 'Fun' },
];

const legacyFaces: Record<string, string> = { 'warm-male': 'theo', 'warm-female': 'amara', 'luminous-guide': 'mei', 'neutral-ai': 'lumen' };

export const coachFace = (appearance?: string | null) => {
  const id = legacyFaces[appearance ?? ''] ?? appearance ?? 'lumen';
  return COACH_FACES.find((face) => face.id === id) ?? COACH_FACES[15]!;
};
