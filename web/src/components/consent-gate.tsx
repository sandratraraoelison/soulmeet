'use client';
import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { consentService } from '@/services/consent';

export const consentKey = ['soulprint-consent'] as const;

export function ConsentGate() {
  const client = useQueryClient();
  const panel = useRef<HTMLDivElement>(null);
  const query = useQuery({ queryKey: consentKey, queryFn: consentService.get, retry: false, staleTime: Infinity });
  const save = useMutation({ meta: { successMessage: 'Privacy choice saved.', errorMessage: true }, mutationFn: consentService.update, onSuccess: (data) => client.setQueryData(consentKey, data) });
  const open = query.isError || (!query.isPending && !query.data?.hasChoice);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); return; }
      if (event.key !== 'Tab' || !panel.current) return;
      const nodes = [...panel.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (!nodes.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', trap); previous?.focus(); };
  }, [open]);
  if (query.isPending || !open) return null;
  return <div className="consent-overlay" role="presentation">
    <div ref={panel} className="consent-dialog" role="dialog" aria-modal="true" aria-labelledby="consent-title" tabIndex={-1}>
      {query.isError ? <><p className="error" role="alert">We could not load your privacy choice.</p><button className="button" onClick={() => void query.refetch()}>Try again</button></> : <>
        <h2 id="consent-title">Make your Soulprint even more accurate</h2>
        <p>Your Soulprint becomes more accurate as Soulmeet learns about your personality, communication style, values, interests and relationship preferences.</p>
        <p>You can allow Soulmeet AI to learn from your conversations with other people on Soulmeet. Real conversations often reveal small but meaningful details that a traditional questionnaire cannot capture.</p>
        <p>If you allow access, the AI will analyze relevant patterns from your conversations to improve your Soulprint. This analysis is automated: only the AI ever accesses your messages, and no human will ever read your conversations. The AI only learns from your own messages, never from what the people you talk to have written. Your private messages will not be displayed in your Soulprint, and Soulmeet will never send messages or speak on your behalf.</p>
        <p>If you prefer not to allow access, that’s completely fine. Your AI Coach will occasionally ask you questions and request feedback directly so your Soulprint can still evolve and become more accurate over time.</p>
        <div className="consent-options">
          <Choice title="Allow AI to learn from my conversations" text="Soulmeet AI can analyze relevant patterns from my new conversations to better understand my communication style, interests, values and relationship preferences." button="Allow and continue" disabled={save.isPending} onClick={() => save.mutate(true)} />
          <Choice title="Keep my conversations private" text="Soulmeet will not use my conversations with other users to build my Soulprint. My AI Coach may occasionally ask me questions and request feedback instead." button="Continue without conversation access" disabled={save.isPending} onClick={() => save.mutate(false)} secondary />
        </div>
        {save.isError ? <p className="error" role="alert">We could not save your choice. Please try again.</p> : null}
        <small>You can change this choice at any time in AI &amp; Soulprint Privacy settings.</small>
      </>}
    </div>
  </div>;
}
function Choice({ title, text, button, disabled, onClick, secondary = false }: { title: string; text: string; button: string; disabled: boolean; onClick: () => void; secondary?: boolean }) {
  return <section className="consent-option"><h3>{title}</h3><p>{text}</p><button className={`button ${secondary ? 'secondary' : ''}`} disabled={disabled} onClick={onClick}>{disabled ? 'Saving…' : button}</button></section>;
}
