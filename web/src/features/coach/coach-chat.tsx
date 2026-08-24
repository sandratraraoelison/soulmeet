'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Check, Copy, RotateCw, Send, Square, Trash2 } from 'lucide-react';
import { ApiError } from '@/services/api';
import { guidanceService, streamCoachReply } from '@/services/guidance';
import { profileService } from '@/services/profile';
import { useGenericMutation } from '@/lib/use-generic-mutation';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Failure, Loading } from '@/components/remote';
import { BackButton } from '@/components/ui/back-button';
import type { GuidanceMessage } from '@/types';
export function CoachChat() {
  const router = useRouter();
  const qc = useQueryClient();
  const [draft, setDraft] = useState('');
  const [stream, setStream] = useState('');
  const [failedMessage, setFailedMessage] = useState('');
  const [pendingDraft, setPendingDraft] = useState<{ id: string; content: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [earlier, setEarlier] = useState<GuidanceMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const prevScrollHeight = useRef(0);
  const prevEarlierCount = useRef(0);
  const profile = useQuery({
    queryKey: ['profile'],
    queryFn: profileService.get,
  });
  const coach = useQuery({
    queryKey: ['coach'],
    queryFn: guidanceService.coach,
  });
  const suggestion = useQuery({
    queryKey: ['guidance', 'suggestion'],
    queryFn: guidanceService.suggestion,
  });
  const conversation = useQuery({
    queryKey: ['guidance', 'active'],
    queryFn: guidanceService.activeConversation,
  });
  const messages = useQuery({
    queryKey: ['guidance', 'messages', conversation.data?.id],
    enabled: !!conversation.data,
    queryFn: () => guidanceService.messages(conversation.data!.id),
  });
  const cursor = nextCursor ?? messages.data?.nextCursor;
  const ordered = [...earlier, ...(messages.data?.messages ?? [])].reverse();
  useEffect(() => {
    if (coach.error instanceof ApiError && coach.error.status === 404) {
      router.replace('/onboarding');
    }
  }, [coach.error, router]);
  const conversationId = conversation.data?.id;
  const [trackedConversationId, setTrackedConversationId] = useState<string | undefined>(
    conversationId,
  );
  if (conversationId !== trackedConversationId) {
    setTrackedConversationId(conversationId);
    setEarlier([]);
    setNextCursor(null);
  }
  useLayoutEffect(() => {
    nearBottom.current = true;
    prevEarlierCount.current = 0;
  }, [conversationId]);
  const loadEarlier = useMutation({
    mutationFn: (cursorValue: string) => guidanceService.messages(conversation.data!.id, cursorValue),
    onMutate: () => {
      prevScrollHeight.current = containerRef.current?.scrollHeight ?? 0;
    },
    onSuccess: (page) => {
      setEarlier((prev) => [...prev, ...page.messages]);
      setNextCursor(page.nextCursor);
    },
  });
  useLayoutEffect(() => {
    if (earlier.length === prevEarlierCount.current) return;
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight - prevScrollHeight.current;
    prevEarlierCount.current = earlier.length;
  }, [earlier]);
  const onScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };
  useEffect(() => {
    if (nearBottom.current) bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ordered.length, stream, pendingDraft?.id]);
  const send = useMutation({
    mutationFn: async (content: string) => {
      if (!conversation.data) return;
      setFailedMessage(content);
      setPendingDraft({ id: crypto.randomUUID(), content });
      abort.current = new AbortController();
      setStream('');
      await streamCoachReply({
        conversationId: conversation.data.id,
        content,
        signal: abort.current.signal,
        onToken: (token) => setStream((current) => current + token),
      });
    },
    onSuccess: () =>
      qc
        .invalidateQueries({
          queryKey: ['guidance', 'messages', conversation.data?.id],
        })
        .then(() => {
          setStream('');
          setFailedMessage('');
          setPendingDraft(null);
        }),
    onError: () => {
      setStream('');
      setPendingDraft(null);
    },
  });
  const sendFailed = send.isError && send.error.name !== 'AbortError';
  const messageAction = useGenericMutation([['guidance', 'messages', conversation.data?.id]]);
  const copyMessage = async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1600);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || send.isPending) return;
    setDraft('');
    void send.mutateAsync(content);
  };
  if (profile.isLoading || coach.isLoading || conversation.isLoading || messages.isLoading)
    return (
      <div className="page">
        <Loading />
      </div>
    );
  if (profile.isError || coach.isError || conversation.isError || messages.isError || !coach.data)
    return (
      <div className="page">
        <Failure
          retry={() =>
            void Promise.all([
              profile.refetch(),
              coach.refetch(),
              conversation.refetch(),
              messages.refetch(),
            ])
          }
        />
      </div>
    );
  return (
    <section className="page panel chat">
      <header
        className="card"
        style={{
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <BackButton fallback="/app" />
        <div className="brand-mark">{coach.data.name.slice(0, 1)}</div>
        <div>
          <strong>{coach.data.name}</strong>
          <div className="muted" style={{ fontSize: 12 }}>
            Your private dating coach
          </div>
        </div>
      </header>
      <div className="messages" ref={containerRef} onScroll={onScroll} aria-live="polite">
        {cursor && (
          <div style={{ textAlign: 'center', padding: 8 }}>
            <button
              className="button secondary"
              disabled={loadEarlier.isPending}
              onClick={() => loadEarlier.mutate(cursor)}
            >
              {loadEarlier.isPending ? 'Loading earlier messages…' : 'Load earlier messages'}
            </button>
          </div>
        )}
        {!ordered.length && !pendingDraft && (
          <div className="bubble assistant">
            {suggestion.data?.message ??
              `Hey ${profile.data?.firstName}, how are you doing today? Tell me one interesting thing about you or your dating life.`}
          </div>
        )}
        {ordered
          .filter((m) => !m.isDeleted && m.content)
          .map((m) => (
            <article key={m.id} className={`bubble ${m.role === 'USER' ? 'user' : 'assistant'}`}>
              <div>{m.content}</div>
              <div className="bubble-actions">
                    {m.role === 'USER' && m.content && (
                      <button
                        type="button"
                        className="button ghost icon-button chat-message-action"
                        aria-label={copiedId === m.id ? 'Message copied' : 'Copy message'}
                        title={copiedId === m.id ? 'Copied' : 'Copy'}
                        onClick={() => void copyMessage(m.id, m.content!)}
                      >
                        {copiedId === m.id ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    )}
                    {m.role === 'ASSISTANT' && (
                      <button
                        type="button"
                        className="button ghost icon-button chat-message-action"
                        aria-label="Regenerate reply"
                        title="Regenerate"
                        disabled={messageAction.isPending}
                        onClick={() =>
                          messageAction.mutate({
                            path: `/guidance/messages/${m.id}/regenerate`,
                            method: 'POST',
                          })
                        }
                      >
                        <RotateCw size={16} />
                      </button>
                    )}
                    <ConfirmButton
                      icon={<Trash2 size={16} />}
                      confirmIcon={<Check size={16} />}
                      label="Delete message"
                      ariaLabel="Delete message"
                      className="button ghost icon-button chat-message-action chat-message-delete"
                      disabled={messageAction.isPending}
                      onConfirm={() =>
                        messageAction.mutate({
                          path: `/guidance/messages/${m.id}`,
                          method: 'DELETE',
                        })
                      }
                    />
                  </div>
            </article>
          ))}
        {pendingDraft && <article className="bubble user">{pendingDraft.content}</article>}
        {send.isPending && !stream && (
          <article className="bubble assistant coach-reply coach-thinking" aria-label="Coach is thinking">
            <span />
            <span />
            <span />
          </article>
        )}
        {stream && (
          <article className="bubble assistant coach-reply">
            {stream}
            <span className="stream-cursor" aria-label="Generating"> ▍</span>
          </article>
        )}
        {sendFailed && (
          <div role="alert" className="error">
            <p>The Coach could not reply. Your message is safe.</p>
            <button
              type="button"
              className="button secondary"
              disabled={!failedMessage}
              onClick={() => void send.mutateAsync(failedMessage)}
            >
              Try again
            </button>
          </div>
        )}
        {messageAction.isError && (
          <div role="alert" className="error">
            {messageAction.error.message}
          </div>
        )}
        <div ref={bottom} />
      </div>
      <form className="composer" onSubmit={submit}>
        <textarea
          aria-label={`Message ${coach.data.name}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.closest('form')?.requestSubmit();
            }
          }}
          placeholder="Talk to your Coach..."
          maxLength={8000}
        />
        {send.isPending ? (
          <button
            type="button"
            className="button secondary"
            aria-label="Stop generating"
            onClick={() => abort.current?.abort()}
          >
            <Square size={18} />
          </button>
        ) : (
          <button className="button" aria-label="Send message" disabled={!draft.trim()}>
            <Send size={18} />
          </button>
        )}
      </form>
    </section>
  );
}
