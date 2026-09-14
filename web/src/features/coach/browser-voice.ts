import type { CoachGender } from '@/types';

// Web Speech has no gender field. Recognize explicit labels and a small set of
// documented Microsoft voices; never infer gender from arbitrary first names.
// https://support.microsoft.com/en-us/accessibility/windows/narrator/appendix-a-supported-languages-and-voices
function voiceGender(voice: SpeechSynthesisVoice): 'MALE' | 'FEMALE' | undefined {
  if (/\bfemale\b/i.test(voice.name)) return 'FEMALE';
  if (/\bmale\b/i.test(voice.name)) return 'MALE';
  if (/\bmicrosoft\b/i.test(voice.name)) {
    if (/\b(zira|hazel|susan|aria|jenny)\b/i.test(voice.name)) return 'FEMALE';
    if (/\b(david|mark|george|guy)\b/i.test(voice.name)) return 'MALE';
  }
  return undefined;
}

// The Web Speech API exposes no quality score. Names are a best-effort hint;
// only rank voices actually supplied by this browser, never assume availability.
export function preferredEnglishVoice(voices: SpeechSynthesisVoice[], gender?: CoachGender | null) {
  const score = (voice: SpeechSynthesisVoice) =>
    (/natural|neural|premium|enhanced/i.test(voice.name) ? 100 : 0) +
    (/google/i.test(voice.name) ? 40 : 0) +
    (/^en[-_]US$/i.test(voice.lang) ? 10 : 0) +
    (voice.default ? 1 : 0);
  const english = voices.filter((voice) => /^en(?:[-_]|$)/i.test(voice.lang));
  const matching =
    gender === 'MALE' || gender === 'FEMALE'
      ? english.filter((voice) => voiceGender(voice) === gender)
      : [];
  return (matching.length ? matching : english).sort((a, b) => score(b) - score(a))[0];
}
