import { loginSchema, registerSchema } from '../auth.schemas';
import { coachSchema, profileSchema } from '../onboarding.schemas';
describe('form schemas', () => {
  it('rejects invalid email, short password, and mismatched confirmation', () => {
    expect(
      loginSchema.safeParse({ email: 'bad', password: '123' }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({
        email: 'a@b.com',
        password: 'password',
        confirmPassword: 'different',
      }).success,
    ).toBe(false);
  });
  it('accepts a valid registration', () => {
    expect(
      registerSchema.safeParse({
        email: 'jane@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        firstName: 'Jane',
        birthDate: '1998-06-15',
        gender: 'NON_GENDERED',
        country: 'France',
        location: 'Paris',
      }).success,
    ).toBe(true);
  });
  it('rejects minors and accepts backend enum values', () => {
    const minor = new Date();
    minor.setFullYear(minor.getFullYear() - 12);
    expect(
      profileSchema.safeParse({
        firstName: 'Jane',
        birthDate: minor.toISOString(),
        gender: 'FEMALE',
        sexualOrientation: 'BISEXUAL',
        country: 'France',
        city: 'Paris',
      }).success,
    ).toBe(false);
    expect(
      coachSchema.safeParse({
        name: 'Milo',
        gender: 'NON_GENDERED',
        traits: ['EMPATHETIC', 'FRIENDLY'],
      }).success,
    ).toBe(true);
  });
});
