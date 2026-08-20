import { describe, expect, it } from 'vitest';
import type { CoachGender, DatingGenderPreference } from './index';
describe('gender fields', () => {
  it('keeps dating preference and coach identity as separate properties', () => {
    const state: { datingGenderPreference: DatingGenderPreference; coachGender: CoachGender } = {
      datingGenderPreference: 'FEMALE',
      coachGender: 'NON_GENDERED',
    };
    expect(state).toEqual({ datingGenderPreference: 'FEMALE', coachGender: 'NON_GENDERED' });
  });
});
