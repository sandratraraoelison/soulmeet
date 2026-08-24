'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Search, Trash2 } from 'lucide-react';
import { guidanceService } from '@/services/guidance';
import type { GuidanceMessage } from '@/types';

const dayKey = (value: string) => new Date(value).toDateString();
const dayLabel = (value: string) => {
  const date = new Date(value); const today = new Date(); const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (dayKey(value) === today.toDateString()) return 'Today';
  if (dayKey(value) === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
};

export default function CoachArchivePage() {
  const [query, setQuery] = useState('');
  const client = useQueryClient();
  const archive = useInfiniteQuery({ queryKey: ['guidance', 'archive', query.trim()], initialPageParam: undefined as string | undefined, queryFn: ({ pageParam }) => guidanceService.archive(query.trim(), pageParam), getNextPageParam: (page) => page.nextCursor ?? undefined });
  const remove = useMutation({ meta: { successMessage: 'Conversation deleted.', errorMessage: true }, mutationFn: guidanceService.deleteConversation, onSuccess: () => client.invalidateQueries({ queryKey: ['guidance', 'archive'] }) });
  const messages = useMemo(() => (archive.data?.pages.flatMap((page) => page.messages) ?? []).filter((message) => message.content).reverse(), [archive.data]);
  const deleteConversation = (id: string) => { if (window.confirm('Delete this conversation from your Coach archive permanently?')) remove.mutate(id); };
  return <section className="page coach-archive">
    <header className="coach-archive-header"><div><div className="eyebrow">Discover</div><h1>Coach archive</h1><p className="muted">One continuous, read-only history of your conversations.</p></div></header>
    <label className="coach-archive-search"><Search size={18} aria-hidden /><input aria-label="Search Coach archive" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search past conversations" /></label>
    <aside className="coach-archive-banner"><span>To keep talking, go back to your coach.</span><Link className="button secondary" href="/app"><ArrowLeft size={16} /> Back to your coach</Link></aside>
    <div className="coach-archive-thread" aria-live="polite">
      {archive.isPending ? <p className="muted">Loading your archive…</p> : null}
      {archive.isError ? <div className="error" role="alert">Unable to load your archive. <button className="button secondary" onClick={() => void archive.refetch()}>Try again</button></div> : null}
      {!archive.isPending && !messages.length ? <p className="muted coach-archive-empty">{query.trim() ? 'No matching messages.' : 'Your Coach archive is empty.'}</p> : null}
      {messages.map((message, index) => <ArchiveMessage key={message.id} message={message} previous={messages[index - 1]} onDelete={deleteConversation} />)}
      {archive.hasNextPage ? <button className="button ghost" disabled={archive.isFetchingNextPage} onClick={() => void archive.fetchNextPage()}>{archive.isFetchingNextPage ? 'Loading…' : 'Load earlier messages'}</button> : null}
    </div>
  </section>;
}

function ArchiveMessage({ message, previous, onDelete }: { message: GuidanceMessage; previous?: GuidanceMessage; onDelete: (id: string) => void }) {
  const newDay = !previous || dayKey(previous.createdAt) !== dayKey(message.createdAt);
  const newConversation = !previous || previous.conversationId !== message.conversationId;
  return <>
    {newDay ? <div className="coach-archive-date"><span>{dayLabel(message.createdAt)}</span></div> : null}
    {newConversation ? <button className="coach-archive-delete" aria-label="Delete this archived conversation" onClick={() => onDelete(message.conversationId)}><Trash2 size={13} /> Delete this conversation</button> : null}
    <article className={`bubble ${message.role === 'USER' ? 'user' : 'assistant'}`}><div>{message.content}</div><time>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></article>
  </>;
}
