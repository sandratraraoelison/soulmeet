'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Empty, ErrorState, Loading } from '@/components/page-state';
import { Pagination } from '@/components/ui';
import { useToast } from '@/components/toast';
import { api } from '@/lib/api';
import type { Page } from '@/lib/types';

type Conversation = { id: string; type?: string; title?: string | null; status?: string; createdAt: string; lastMessageAt?: string | null; participants?: { user: { email: string } }[]; user?: { email: string }; _count: { messages: number } };
type ConversationMessage = { id: string; role?: string; sender?: { email: string; profile?: { firstName: string } | null }; content: string | null; isDeleted: boolean; createdAt: string };
type AccessGrant = { conversationId: string; grantedAt: string; expiresAt: string; windowMinutes: number };

export default function ConversationsPage() {
  const [kind, setKind] = useState<'member' | 'coach'>('member');
  const [page, setPage] = useState(1);
  const [pendingAccess, setPendingAccess] = useState<Conversation | null>(null);
  const [justification, setJustification] = useState('');
  const [openConversation, setOpenConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[] | null>(null);
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const endpoint = kind === 'member' ? 'admin/conversations' : 'admin/guidance-conversations';
  const query = useQuery({ queryKey: ['conversations', kind, page], queryFn: () => api<Page<Conversation>>(`${endpoint}?page=${page}&limit=20`) });

  const requestAccess = useMutation({
    mutationFn: (conversationId: string) => api<AccessGrant>(`${endpoint}/${conversationId}/access`, { method: 'POST', body: JSON.stringify({ justification }) }),
    onSuccess: (grant) => {
      setPendingAccess(null);
      setJustification('');
      notify('success', `Access granted for ${grant.windowMinutes} minutes. It is recorded in the audit log.`);
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error) => notify('error', error.message),
  });
  const viewMessages = useMutation({
    mutationFn: (conversationId: string) => api<{ conversationId: string; messages: ConversationMessage[] }>(`${endpoint}/${conversationId}/messages`),
    onSuccess: (data) => setMessages(data.messages),
    onError: (error) => notify('error', error.message),
  });

  const switchKind = (next: 'member' | 'coach') => { setKind(next); setPage(1); setOpenConversation(null); setMessages(null); };

  return <><div className="heading"><div><h1>Conversations</h1><p>Metadata-only oversight. Viewing message content requires a justified, audited access window.</p></div></div><div className="tabs" role="tablist"><button className={kind === 'member' ? 'tab active' : 'tab'} onClick={() => switchKind('member')}>Member conversations</button><button className={kind === 'coach' ? 'tab active' : 'tab'} onClick={() => switchKind('coach')}>AI coach conversations</button></div>{query.isLoading ? <Loading /> : query.error ? <ErrorState message={query.error.message} /> : !query.data?.items.length ? <Empty label="No conversations in this view" /> : <><div className="tablewrap"><table><thead><tr><th>Participants</th><th>Type / status</th><th>Messages</th><th>Last activity</th><th>Created</th><th>Actions</th></tr></thead><tbody>{query.data.items.map(item => <tr key={item.id}><td>{kind === 'member' ? item.participants?.map(participant => participant.user.email).join(', ') : item.user?.email}</td><td>{item.type ?? item.status ?? '—'}</td><td>{item._count.messages}</td><td>{item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleString() : '—'}</td><td>{new Date(item.createdAt).toLocaleDateString()}</td><td><div className="row-actions"><button className="button" disabled={viewMessages.isPending} onClick={() => { setOpenConversation(item); setMessages(null); viewMessages.mutate(item.id); }}>View messages</button><button className="button primary" disabled={requestAccess.isPending} onClick={() => { setPendingAccess(item); setJustification(''); }}>Request access</button></div></td></tr>)}</tbody></table></div><Pagination data={query.data} onPageChange={setPage} /></>}
    {openConversation && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpenConversation(null); }}>
      <section className="modal message-modal" role="dialog" aria-modal="true" aria-label="Conversation messages">
        <div><h2>Conversation messages</h2><p className="muted">{kind === 'member' ? openConversation.participants?.map(participant => participant.user.email).join(' · ') : openConversation.user?.email}</p></div>
        {viewMessages.isPending ? <Loading /> : viewMessages.error ? <ErrorState message={viewMessages.error.message} /> : messages === null ? <p className="muted">Request a fresh access window to view content.</p> : <div className="message-list">{messages.length ? messages.map(message => <div className="message-row" key={message.id}><span className="muted">{kind === 'member' ? (message.sender?.email ?? 'Deleted') : (message.role ?? 'message')} · {new Date(message.createdAt).toLocaleString()}</span><p>{message.isDeleted || message.content === null ? <em className="muted">Deleted message</em> : message.content}</p></div>) : <p className="muted">No messages in this conversation.</p>}</div>}
        <div className="modal-actions"><button className="button" onClick={() => { setOpenConversation(null); setMessages(null); }}>Close</button></div>
      </section>
    </div>}
    <ConfirmDialog open={Boolean(pendingAccess)} title="Request message access?" description="Your justification and the access window are recorded in the audit log. The window expires after 10 minutes." confirmLabel="Request access" pending={requestAccess.isPending} error={requestAccess.error?.message} onCancel={() => setPendingAccess(null)} onConfirm={() => { if (!pendingAccess) return; if (justification.trim().length < 10) return notify('error', 'Provide a justification of at least 10 characters.'); requestAccess.mutate(pendingAccess.id); }}>
      {pendingAccess && <div className="modal-form"><div className="modal-user"><strong>{kind === 'member' ? pendingAccess.participants?.map(participant => participant.user.email).join(' · ') : pendingAccess.user?.email}</strong><span className="muted">{pendingAccess._count.messages} messages</span></div><label className="field"><span>Justification</span><textarea className="input" minLength={10} maxLength={1000} required value={justification} onChange={(event) => setJustification(event.target.value)} placeholder="Why do you need to read this conversation?" /></label></div>}
    </ConfirmDialog>
  </>;
}
