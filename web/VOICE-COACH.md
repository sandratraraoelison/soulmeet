# Web voice coach test

Click **Talk to your coach** in the web coach chat and allow microphone access. Voice chat uses English recognition and playback. Pause to send your message. The coach replies aloud, then listening resumes. **End voice chat** stops capture, playback and the current request. Messages remain in the conversation; keyboard input is disabled during voice sessions.

Use Chrome with a microphone on http://localhost:3001 or HTTPS. Support varies by browser. This is a turn-based conversation; end and restart voice chat to interrupt a reply.

Playback first looks for an English voice matching the coach's FEMALE or MALE setting. Web Speech does not expose gender, so matching uses explicit Female/Male labels and recognized Microsoft voice names (Zira, Hazel, Susan, Aria, Jenny; David, Mark, George, Guy). It does not guess from arbitrary first names. For NON_GENDERED coaches or when no match is available, selection falls back to the available English voices.

Within that selection, playback prefers voices with Natural, Neural, Premium or Enhanced in their name, followed by Google English voices when available. These naming heuristics cannot guarantee gender matching or quality on every device. Voices refresh when the browser loads them. Rate is slightly slower (0.96), with normal pitch. Without a listed English voice, the browser resolves en-US itself.

Web Speech adds no paid voice service or API key. Recognition may require Internet and send audio to the browser provider. Soulmeet processes transcripts like written messages.

The AI provider is unchanged. For a test without paid AI API usage, start Ollama, download llama3.1:8b, configure LLM_PROVIDER=ollama, OLLAMA_BASE_URL=http://localhost:11434 and OLLAMA_MODEL=llama3.1:8b in your test environment, then restart the backend. Local computing resources are required.

Manual checks: microphone permission/denial, English transcription, audible reply, resumed listening, stopping in each phase, navigation away, unsupported browsers, network errors, narrow screens and light/dark themes. Automated tests simulate speech APIs; actual voice quality requires a real browser and microphone.

References: [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API), [voice loading](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/voiceschanged_event).
