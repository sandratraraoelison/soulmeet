import type { CoachGender } from '@/types';

export interface CoachFaceOption {
  id: string; title: string; description: string; gender: CoachGender; index: number;
  category: 'Men' | 'Women' | 'Fun';
}

export const COACH_FACES: CoachFaceOption[] = [
  { id: 'malik', title: 'Malik', description: 'Warm, upbeat, and quick to help you see the good in yourself.', gender: 'MALE', index: 0, category: 'Men' },
  { id: 'kenji', title: 'Kenji', description: 'Calm and thoughtful, with a talent for making things feel simpler.', gender: 'MALE', index: 1, category: 'Men' },
  { id: 'arjun', title: 'Arjun', description: 'Insightful and grounded, with gentle questions that go deeper.', gender: 'MALE', index: 2, category: 'Men' },
  { id: 'theo', title: 'Theo', description: 'Friendly, honest, and reassuring when your mind starts racing.', gender: 'MALE', index: 3, category: 'Men' },
  { id: 'sami', title: 'Sami', description: 'Patient and perceptive, with a steady, caring presence.', gender: 'MALE', index: 4, category: 'Men' },
  { id: 'mateo', title: 'Mateo', description: 'Relaxed and encouraging, with warmth and a little humor.', gender: 'MALE', index: 5, category: 'Men' },
  { id: 'amara', title: 'Amara', description: 'Bright and uplifting, always in your corner without judging.', gender: 'FEMALE', index: 6, category: 'Women' },
  { id: 'mei', title: 'Mei', description: 'Serene and attentive, helping you hear what you really feel.', gender: 'FEMALE', index: 7, category: 'Women' },
  { id: 'priya', title: 'Priya', description: 'Curious and insightful, gently noticing the patterns you miss.', gender: 'FEMALE', index: 8, category: 'Women' },
  { id: 'clara', title: 'Clara', description: 'Kind and direct, bringing clarity without ever feeling cold.', gender: 'FEMALE', index: 9, category: 'Women' },
  { id: 'layla', title: 'Layla', description: 'Confident and caring, helping you trust your own boundaries.', gender: 'FEMALE', index: 10, category: 'Women' },
  { id: 'sofia', title: 'Sofia', description: 'Joyful and open-hearted, with a naturally optimistic energy.', gender: 'FEMALE', index: 11, category: 'Women' },
  { id: 'nova', title: 'Nova', description: 'An intuitive visitor from somewhere kinder in the universe.', gender: 'NON_GENDERED', index: 12, category: 'Fun' },
  { id: 'buddy', title: 'Buddy', description: 'Loyal, cheerful, and always genuinely excited to listen.', gender: 'NON_GENDERED', index: 13, category: 'Fun' },
  { id: 'miso', title: 'Miso', description: 'Curious, observant, and quietly convinced you deserve better.', gender: 'NON_GENDERED', index: 14, category: 'Fun' },
  { id: 'lumen', title: 'Lumen', description: 'A calm, neutral AI presence shaped by light and empathy.', gender: 'NON_GENDERED', index: 15, category: 'Fun' },
];

const legacyFaces: Record<string, string> = { 'warm-male': 'theo', 'warm-female': 'amara', 'luminous-guide': 'mei', 'neutral-ai': 'lumen' };

export const coachFace = (appearance?: string | null) => {
  const id = legacyFaces[appearance ?? ''] ?? appearance ?? 'lumen';
  return COACH_FACES.find((face) => face.id === id) ?? COACH_FACES[15]!;
};

export const coachFacePosition = (face: CoachFaceOption) => ({
  backgroundPosition: `${(face.index % 4) * (100 / 3)}% ${Math.floor(face.index / 4) * (100 / 3)}%`,
});
