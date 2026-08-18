import { z } from 'zod';
import type {
  CoachPersonality,
  Gender,
  SexualOrientation,
} from '@/types/models';
const adultDate = z.string().refine((value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  return date <= cutoff;
}, 'You must be at least 18 years old.');
export const profileSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.'),
  birthDate: adultDate,
  gender: z.enum(['MALE', 'FEMALE', 'NON_GENDERED']),
  sexualOrientation: z.enum([
    'HETEROSEXUAL',
    'HOMOSEXUAL',
    'BISEXUAL',
    'PANSEXUAL',
    'ASEXUAL',
    'OTHER',
    'PREFER_NOT_TO_SAY',
  ]),
  country: z.string().trim().min(1, 'Country is required.'),
  city: z.string().trim().min(1, 'City is required.'),
  occupation: z.string().trim().max(100, 'Occupation is too long.').optional(),
});
export const coachSchema = z.object({
  name: z.string().trim().min(1, 'Choose a name for your coach.'),
  gender: z.enum(['MALE', 'FEMALE', 'NON_GENDERED']),
  traits: z
    .array(
      z.enum([
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
      ]),
    )
    .min(1, 'Choose at least one personality trait.'),
});
export type ProfileForm = z.infer<typeof profileSchema> & {
  gender: Gender;
  sexualOrientation: SexualOrientation;
};
export type CoachForm = z.infer<typeof coachSchema> & {
  traits: CoachPersonality[];
};
