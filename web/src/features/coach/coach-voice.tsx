'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, PhoneOff } from 'lucide-react';

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
  const [language, setLanguage] = useState('fr-FR');
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
      setError('Vocal indisponible. Essayez Chrome sur localhost ou HTTPS avec un microphone.');
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
      mic.lang = language;
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
            ? 'Autorisez le microphone dans les paramètres du navigateur, puis réessayez.'
            : event.error === 'no-speech'
              ? 'Aucune voix détectée. Relancez le vocal pour réessayer.'
              : 'Reconnaissance vocale interrompue. Vérifiez le micro et la connexion, puis réessayez.',
        );
      mic.onend = () => {
        if (!active()) return;
        recognition.current = null;
        if (!transcript) {
          fail('Aucune voix détectée. Relancez le vocal pour réessayer.');
          return;
        }
        if (transcript.length > 8000) {
          fail('Votre message est trop long. Réessayez avec un message plus court.');
          return;
        }
        setPhase('thinking');
        void (async () => {
          try {
            const reply = await onSend(transcript);
            if (!active()) return;
            if (!reply?.trim()) {
              fail('Le coach n’a pas renvoyé de réponse vocale. Réessayez.');
              return;
            }
            const speech = new SpeechSynthesisUtterance(reply);
            utterance.current = speech;
            speech.lang = language;
            speech.onend = () => {
              utterance.current = null;
              listen();
            };
            speech.onerror = () =>
              fail('Lecture vocale indisponible. La réponse reste visible dans le chat.');
            setPhase('speaking');
            window.speechSynthesis.speak(speech);
          } catch {
            fail('Le coach n’a pas pu répondre. Réessayez depuis le chat.');
          }
        })();
      };
      setPhase('listening');
      try {
        mic.start();
      } catch {
        fail('Impossible de démarrer le microphone. Réessayez.');
      }
    };
    listen();
  }

  return (
    <div className="card" style={{ borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="button secondary"
          disabled={phase === 'off' && busy}
          onClick={phase === 'off' ? start : stop}
          aria-pressed={phase !== 'off'}
        >
          {phase === 'off' ? <Mic size={18} /> : <PhoneOff size={18} />}
          {phase === 'off' ? 'Parler au coach' : 'Arrêter le vocal'}
        </button>
        <select
          aria-label="Langue de la conversation vocale"
          value={language}
          disabled={phase !== 'off'}
          onChange={(event) => setLanguage(event.target.value)}
        >
          <option value="fr-FR">Français</option>
          <option value="en-US">English</option>
        </select>
        <span role="status">
          {phase === 'listening'
            ? 'Je vous écoute…'
            : phase === 'thinking'
              ? 'Le coach réfléchit…'
              : phase === 'speaking'
                ? 'Le coach vous répond…'
                : 'Test vocal web'}
        </span>
      </div>
      <p className="muted" style={{ fontSize: 12 }}>
        Faites une pause pour envoyer votre message. Le micro reprend après la réponse. La
        reconnaissance peut transmettre votre voix au service du navigateur.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
