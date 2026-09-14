import { expect, it } from 'vitest';
import { preferredEnglishVoice } from './browser-voice';

const voice = (name: string, lang: string, isDefault = false) => ({
  name,
  lang,
  default: isDefault,
  localService: true,
  voiceURI: name,
});

it('prefers an enhanced English voice over a basic default and excludes other languages', () => {
  const natural = voice('English (Natural)', 'en-GB');
  expect(
    preferredEnglishVoice([
      voice('French Premium', 'fr-FR'),
      voice('Basic', 'en-US', true),
      natural,
    ]),
  ).toBe(natural);
});

it('uses a supplied Google English voice before a basic English voice', () => {
  const google = voice('Google US English', 'en-US');
  expect(preferredEnglishVoice([voice('Basic', 'en-US', true), google])).toBe(google);
});

it('falls back to an available English voice or leaves the browser to resolve en-US', () => {
  const fallback = voice('Basic', 'en-US');
  expect(preferredEnglishVoice([fallback])).toBe(fallback);
  expect(preferredEnglishVoice([])).toBeUndefined();
  expect(preferredEnglishVoice([voice('French', 'fr-FR')])).toBeUndefined();
});

it.each(['MALE', 'FEMALE'] as const)(
  'matches a %s coach before ranking voice quality',
  (gender) => {
    const male = voice('Microsoft David Desktop', 'en-US');
    const female = voice('Microsoft Zira Desktop', 'en-US');
    expect(preferredEnglishVoice([voice('Unknown Natural', 'en-US'), male, female], gender)).toBe(
      gender === 'MALE' ? male : female,
    );
  },
);

it('keeps natural voice preference within the matching gender', () => {
  const natural = voice('Microsoft Jenny Online (Natural)', 'en-US');
  expect(preferredEnglishVoice([voice('Microsoft Zira', 'en-US'), natural], 'FEMALE')).toBe(
    natural,
  );
});

it('does not confuse female and male labels', () => {
  const male = voice('Google UK English Male', 'en-GB');
  const female = voice('Google UK English Female', 'en-GB');
  expect(preferredEnglishVoice([female, male], 'MALE')).toBe(male);
  expect(preferredEnglishVoice([male, female], 'FEMALE')).toBe(female);
});

it('falls back without guessing when gender is unspecified or no matching English voice exists', () => {
  const fallback = voice('Unknown Natural', 'en-US');
  const voices = [voice('Microsoft David', 'en-US'), voice('Female', 'fr-FR'), fallback];
  expect(preferredEnglishVoice(voices, 'FEMALE')).toBe(fallback);
  expect(preferredEnglishVoice(voices, 'NON_GENDERED')).toBe(fallback);
  expect(preferredEnglishVoice(voices, null)).toBe(fallback);
  expect(preferredEnglishVoice([], 'MALE')).toBeUndefined();
});
