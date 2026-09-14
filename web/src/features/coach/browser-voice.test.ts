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
