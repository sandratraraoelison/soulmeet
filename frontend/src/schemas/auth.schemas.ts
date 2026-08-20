import { z } from 'zod';
export const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must contain at least 8 characters.'),
});
const adultBirthDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD format.')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
    );
  }, 'Enter a valid date of birth.')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    const today = new Date();
    const cutoff = new Date(
      Date.UTC(
        today.getUTCFullYear() - 19,
        today.getUTCMonth(),
        today.getUTCDate(),
      ),
    );
    return date <= cutoff;
  }, 'You must be at least 19 years old.');
export const registerSchema = loginSchema
  .extend({
    confirmPassword: z.string(),
    firstName: z.string().trim().min(1, 'First name is required.'),
    birthDate: adultBirthDate,
    gender: z.enum(['MALE', 'FEMALE', 'NON_GENDERED']),
    country: z.string().trim().min(1, 'Country of residence is required.'),
    location: z.string().trim().min(1, 'City of residence is required.'),
    occupation: z.string().trim().max(100, 'Occupation is too long.').optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });
export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
