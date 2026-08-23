import type { CoachGender, CoachPersonality } from '@/types/models';
import type { ImageSourcePropType } from 'react-native';

export interface CoachFaceOption {
  id: string; name: string; title: string; description: string; gender: CoachGender;
  category: 'Men' | 'Women' | 'AI'; defaultTraits: CoachPersonality[];
}

export const COACH_FACES: CoachFaceOption[] = [
  { id: 'jun-su', name: 'Jun-Su', title: 'Friendly & honest', description: 'Warm, direct and reassuring.', gender: 'MALE', category: 'Men', defaultTraits: ['FRIENDLY', 'DIRECT', 'EMPATHETIC'] },
  { id: 'kenji', name: 'Kenji', title: 'Calm & confident', description: 'Sharp, composed guidance without detours.', gender: 'MALE', category: 'Men', defaultTraits: ['SERIOUS', 'DIRECT', 'DATING_EXPERT'] },
  { id: 'haoran', name: 'Haoran', title: 'Funny & approachable', description: 'Big-hearted encouragement with useful humor.', gender: 'MALE', category: 'Men', defaultTraits: ['FUNNY', 'FRIENDLY', 'CARING'] },
  { id: 'john', name: 'John', title: 'Honest & grounded', description: 'Practical perspective with a dry, knowing edge.', gender: 'MALE', category: 'Men', defaultTraits: ['DIRECT', 'SERIOUS', 'BRO_VIBE'] },
  { id: 'giovanni', name: 'Giovanni', title: 'Open & encouraging', description: 'Positive energy and confident support.', gender: 'MALE', category: 'Men', defaultTraits: ['FRIENDLY', 'DATING_EXPERT', 'EMPATHETIC'] },
  { id: 'kofi', name: 'Kofi', title: 'Warm & reassuring', description: 'Patient support that makes sharing feel easier.', gender: 'MALE', category: 'Men', defaultTraits: ['CARING', 'SOFT', 'EMPATHETIC'] },
  { id: 'joao', name: 'João', title: 'Cool & perceptive', description: 'Calm observations and clear advice without pressure.', gender: 'MALE', category: 'Men', defaultTraits: ['DATING_EXPERT', 'DIRECT', 'LESS_DIRECTIVE'] },
  { id: 'arjun', name: 'Arjun', title: 'Thoughtful & dignified', description: 'Gentle questions from a steady mentor.', gender: 'MALE', category: 'Men', defaultTraits: ['THERAPIST', 'EMPATHETIC', 'SOFT'] },
  { id: 'chai', name: 'Chai', title: 'Playful & upbeat', description: 'Lively honesty for heavy moments.', gender: 'MALE', category: 'Men', defaultTraits: ['FUNNY', 'FRIENDLY', 'BRO_VIBE'] },
  { id: 'sami', name: 'Sami', title: 'Wise & intense', description: 'Focused listening and thoughtful guidance.', gender: 'MALE', category: 'Men', defaultTraits: ['THERAPIST', 'SERIOUS', 'EMPATHETIC'] },
  { id: 'seo-yeon', name: 'Seo-Yeon', title: 'Gentle & attentive', description: 'A patient presence that listens first.', gender: 'FEMALE', category: 'Women', defaultTraits: ['SOFT', 'EMPATHETIC', 'CARING'] },
  { id: 'yuki', name: 'Yuki', title: 'Cheerful & playful', description: 'Bright energy and easy conversation.', gender: 'FEMALE', category: 'Women', defaultTraits: ['FUNNY', 'FRIENDLY', 'SISTER_VIBE'] },
  { id: 'yuxin', name: 'Yuxin', title: 'Direct & composed', description: 'Clear-eyed feedback with confident boundaries.', gender: 'FEMALE', category: 'Women', defaultTraits: ['DIRECT', 'SERIOUS', 'MORE_DIRECTIVE'] },
  { id: 'malee', name: 'Malee', title: 'Warm & maternal', description: 'Generous reassurance and grounded care.', gender: 'FEMALE', category: 'Women', defaultTraits: ['CARING', 'EMPATHETIC', 'SOFT'] },
  { id: 'anna', name: 'Anna', title: 'Natural & balanced', description: 'Easygoing support with thoughtful perspective.', gender: 'FEMALE', category: 'Women', defaultTraits: ['FRIENDLY', 'EMPATHETIC', 'LESS_DIRECTIVE'] },
  { id: 'lucia', name: 'Lucía', title: 'Lively & warm', description: 'Curious conversation with optimism and insight.', gender: 'FEMALE', category: 'Women', defaultTraits: ['FRIENDLY', 'FUNNY', 'EMPATHETIC'] },
  { id: 'priya', name: 'Priya', title: 'Expressive & charming', description: 'Endearing honesty with forward energy.', gender: 'FEMALE', category: 'Women', defaultTraits: ['SISTER_VIBE', 'FUNNY', 'CARING'] },
  { id: 'alia', name: 'Alia', title: 'Elegant & confident', description: 'Poised advice that supports your standards.', gender: 'FEMALE', category: 'Women', defaultTraits: ['DATING_EXPERT', 'DIRECT', 'PROTECTIVE'] },
  { id: 'amara', name: 'Amara', title: 'Curious & attentive', description: 'Warm listening that notices deeper feelings.', gender: 'FEMALE', category: 'Women', defaultTraits: ['EMPATHETIC', 'THERAPIST', 'CARING'] },
  { id: 'maya', name: 'Maya', title: 'Honest & reassuring', description: 'A modern, grounded presence with gentle clarity.', gender: 'FEMALE', category: 'Women', defaultTraits: ['FRIENDLY', 'DIRECT', 'SOFT'] },
  { id: 'lumen', name: 'Lumen', title: 'Calm synthetic guide', description: 'A neutral presence shaped by light and empathy.', gender: 'NON_GENDERED', category: 'AI', defaultTraits: ['EMPATHETIC', 'SOFT', 'THERAPIST'] },
  { id: 'nova', name: 'Nova', title: 'Curious synthetic guide', description: 'Elegant support with thoughtful questions.', gender: 'NON_GENDERED', category: 'AI', defaultTraits: ['THERAPIST', 'CARING', 'LESS_DIRECTIVE'] },
  { id: 'orion', name: 'Orion', title: 'Direct synthetic mentor', description: 'Grounded intelligence with concrete direction.', gender: 'NON_GENDERED', category: 'AI', defaultTraits: ['DIRECT', 'SERIOUS', 'MORE_DIRECTIVE'] },
];

const legacyFaces: Record<string, string> = {
  'warm-male': 'jun-su', 'warm-female': 'amara', 'luminous-guide': 'seo-yeon', 'neutral-ai': 'lumen',
  malik: 'kofi', theo: 'jun-su', mateo: 'giovanni', mei: 'seo-yeon', clara: 'anna',
  layla: 'alia', sofia: 'lucia', buddy: 'haoran', miso: 'yuki',
};

export const coachFace = (appearance?: string | null) => {
  const id = legacyFaces[appearance ?? ''] ?? appearance ?? 'lumen';
  return COACH_FACES.find((face) => face.id === id) ?? COACH_FACES[20]!;
};

export const COACH_FACE_IMAGES: Record<string, ImageSourcePropType> = {
  'jun-su': require('../../../assets/coaches/faces/jun-su.webp'),
  kenji: require('../../../assets/coaches/faces/kenji.webp'),
  haoran: require('../../../assets/coaches/faces/haoran.webp'),
  john: require('../../../assets/coaches/faces/john.webp'),
  giovanni: require('../../../assets/coaches/faces/giovanni.webp'),
  kofi: require('../../../assets/coaches/faces/kofi.webp'),
  joao: require('../../../assets/coaches/faces/joao.webp'),
  arjun: require('../../../assets/coaches/faces/arjun.webp'),
  chai: require('../../../assets/coaches/faces/chai.webp'),
  sami: require('../../../assets/coaches/faces/sami.webp'),
  'seo-yeon': require('../../../assets/coaches/faces/seo-yeon.webp'),
  yuki: require('../../../assets/coaches/faces/yuki.webp'),
  yuxin: require('../../../assets/coaches/faces/yuxin.webp'),
  malee: require('../../../assets/coaches/faces/malee.webp'),
  anna: require('../../../assets/coaches/faces/anna.webp'),
  lucia: require('../../../assets/coaches/faces/lucia.webp'),
  priya: require('../../../assets/coaches/faces/priya.webp'),
  alia: require('../../../assets/coaches/faces/alia.webp'),
  amara: require('../../../assets/coaches/faces/amara.webp'),
  maya: require('../../../assets/coaches/faces/maya.webp'),
  lumen: require('../../../assets/coaches/faces/lumen.webp'),
  nova: require('../../../assets/coaches/faces/nova.webp'),
  orion: require('../../../assets/coaches/faces/orion.webp'),
};
