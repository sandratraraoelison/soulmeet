// The Web Speech API exposes no quality score. Names are a best-effort hint;
// only rank voices actually supplied by this browser, never assume availability.
export function preferredEnglishVoice(voices: SpeechSynthesisVoice[]) {
  const score = (voice: SpeechSynthesisVoice) =>
    (/natural|neural|premium|enhanced/i.test(voice.name) ? 100 : 0) +
    (/google/i.test(voice.name) ? 40 : 0) +
    (/^en[-_]US$/i.test(voice.lang) ? 10 : 0) +
    (voice.default ? 1 : 0);
  return voices
    .filter((voice) => /^en(?:[-_]|$)/i.test(voice.lang))
    .sort((a, b) => score(b) - score(a))[0];
}
