'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, PhoneOff } from 'lucide-react';
import { preferredEnglishVoice } from './browser-voice';
import styles from './coach-voice.module.css';

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export function CoachVoice({
  busy,
  onSend,
  onStop,
  onActiveChange,
}: {
  busy: boolean;
  onSend: (text: string) => Promise<string | undefined>;
  onStop: () => void;
  onActiveChange: (active: boolean) => void;
}) {
  const [phase, setPhase] = useState<'off' | 'listening' | 'thinking' | 'speaking'>('off');
  const [error, setError] = useState('');
  const voices = useRef<SpeechSynthesisVoice[]>([]);
  const generation = useRef(0);
  const recognition = useRef<Recognition | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);

  function cleanup() {
    generation.current++;
    const current = recognition.current;
    recognition.current = null;
    if (current) {
      current.onend = null;
      current.onerror = null;
      current.onresult = null;
      current.abort();
    }
    if (utterance.current) {
      utterance.current.onend = null;
      utterance.current.onerror = null;
      utterance.current = null;
      window.speechSynthesis?.cancel();
    }
  }

  useEffect(() => () => cleanup(), []);
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const refresh = () => {
      voices.current = synth.getVoices();
    };
    refresh();
    synth.addEventListener('voiceschanged', refresh);
    return () => synth.removeEventListener('voiceschanged', refresh);
  }, []);
  const isActive = phase !== 'off';
  useEffect(() => {
    onActiveChange(isActive);
    return () => onActiveChange(false);
  }, [isActive, onActiveChange]);

  function stop() {
    cleanup();
    onStop();
    setPhase('off');
  }

  function start() {
    const speechWindow = window as SpeechWindow;
    const Constructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Constructor || !window.speechSynthesis || !window.isSecureContext) {
      setError('Voice chat is unavailable. Try Chrome on localhost or HTTPS with a microphone.');
      return;
    }
    cleanup();
    setError('');
    const session = generation.current;
    const active = () => generation.current === session;
    const fail = (message: string) => {
      if (!active()) return;
      cleanup();
      setPhase('off');
      setError(message);
    };
    const listen = () => {
      if (!active()) return;
      const mic = new Constructor();
      recognition.current = mic;
      mic.lang = 'en-US';
      mic.continuous = false;
      mic.interimResults = false;
      let transcript = '';
      mic.onresult = (event) => {
        transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join(' ')
          .trim();
      };
      mic.onerror = (event) =>
        fail(
          event.error === 'not-allowed' || event.error === 'service-not-allowed'
            ? 'Allow microphone access in your browser settings, then try again.'
            : event.error === 'no-speech'
              ? 'No speech detected. Start voice chat to try again.'
              : 'Voice recognition stopped. Check your microphone and connection, then try again.',
        );
      mic.onend = () => {
        if (!active()) return;
        recognition.current = null;
        if (!transcript) {
          fail('No speech detected. Start voice chat to try again.');
          return;
        }
        if (transcript.length > 8000) {
          fail('Your message is too long. Please try a shorter message.');
          return;
        }
        setPhase('thinking');
        void (async () => {
          try {
            const reply = await onSend(transcript);
            if (!active()) return;
            if (!reply?.trim()) {
              fail('Your coach did not return a voice reply. Please try again.');
              return;
            }
            const speech = new SpeechSynthesisUtterance(reply);
            utterance.current = speech;
            const voice = preferredEnglishVoice(voices.current);
            if (voice) speech.voice = voice;
            speech.lang = voice?.lang ?? 'en-US';
            speech.rate = 0.96;
            speech.pitch = 1;
            speech.onend = () => {
              utterance.current = null;
              listen();
            };
            speech.onerror = () =>
              fail('Audio playback is unavailable. You can still read the reply in chat.');
            setPhase('speaking');
            window.speechSynthesis.speak(speech);
          } catch {
            fail('Your coach could not reply. Please try again from the chat.');
          }
        })();
      };
      setPhase('listening');
      try {
        mic.start();
      } catch {
        fail('Unable to start the microphone. Please try again.');
      }
    };
    listen();
  }

  return (
    <div className={`${styles.panel} ${isActive ? styles.active : ''}`}>
      <div className={styles.bar}>
        <div className={styles.orb} aria-hidden="true">
          {isActive ? (
            <span className={styles.wave}>
              <i />
              <i />
              <i />
              <i />
            </span>
          ) : (
            <Mic size={22} />
          )}
        </div>
        <div className={styles.copy}>
          <span className={styles.title} role="status">
            {phase === 'listening'
              ? "I'm listening..."
              : phase === 'thinking'
                ? 'Your coach is thinking...'
                : phase === 'speaking'
                  ? 'Your coach is speaking...'
                  : 'A little easier out loud'}
          </span>
          <p className={styles.hint}>
            {isActive
              ? 'Pause to send. Listening resumes after each reply.'
              : 'Talk it through with your coach. English voice chat.'}
          </p>
        </div>
        <button
          type="button"
          className={styles.action}
          disabled={!isActive && busy}
          onClick={isActive ? stop : start}
          aria-pressed={isActive}
        >
          {isActive ? (
            <PhoneOff size={16} aria-hidden="true" />
          ) : (
            <Mic size={16} aria-hidden="true" />
          )}
          {isActive ? 'End voice chat' : 'Talk to your coach'}
        </button>
      </div>
      <details className={styles.privacy}>
        <summary>Voice & privacy</summary>
        <p>
          Your browser may send audio to its speech service. Voice quality depends on your device.
          Your messages stay in this chat.
        </p>
      </details>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
