'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Inbox,
  MapPin,
  MessageCircle,
  Search,
} from 'lucide-react';
import { api, json } from '@/services/api';
import type { Conversation, DiscoverableUser } from '@/types';
import { Failure, Loading } from '@/components/remote';
import { useMeQuery } from '@/providers/me';
import { useConversations } from '@/features/chat/use-chat';
const PAGE_SIZE = 8;
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
const ageFrom = (birthDate: string) => {
  const born = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const month = today.getMonth() - born.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < born.getDate())) age--;
  return age;
};
const timeLabel = (iso?: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { day: 'numeric', month: 'short' });
};
export default function Messages() {
  const router = useRouter();
  const me = useMeQuery();
  const [discoverPage, setDiscoverPage] = useState(0);
  const [conversationSearch, setConversationSearch] = useState('');
  const q = useConversations();
  const discover = useQuery({
    queryKey: ['discover', discoverPage],
    queryFn: () =>
      api<DiscoverableUser[]>(
        `/users/discover?limit=${PAGE_SIZE + 1}&offset=${discoverPage * PAGE_SIZE}`,
      ),
    placeholderData: (previous) => previous,
  });
  const start = useMutation({
    mutationFn: (participantId: string) =>
      api<Conversation>('/conversations/private', json('POST', { participantId })),
    onSuccess: (c) => router.push(`/app/messages/${c.id}`),
  });
  if (me.isLoading || q.isLoading || discover.isLoading)
    return (
      <div className="page">
        <Loading />
      </div>
    );
  if (me.isError || q.isError || discover.isError)
    return (
      <div className="page">
        <Failure retry={() => void Promise.all([me.refetch(), q.refetch(), discover.refetch()])} />
      </div>
    );
  const people = (discover.data ?? []).slice(0, PAGE_SIZE);
  const hasNextPage = (discover.data?.length ?? 0) > PAGE_SIZE;
  const filteredConversations = (q.data ?? []).filter((conversation) => {
    const other = conversation.participants.find((participant) => participant.userId !== me.data?.id);
    const name = other?.user?.profile?.firstName ?? 'Connection';
    const preview = conversation.messages?.[0]?.content ?? '';
    const query = conversationSearch.trim().toLocaleLowerCase();
    return !query || `${name} ${preview}`.toLocaleLowerCase().includes(query);
  });
  return (
    <div className="page messages-page">
      <header className="page-head messages-head">
        <div>
          <div className="eyebrow">Messages</div>
          <h1>Your connections</h1>
          <p className="muted">Pick up where you left off or start a new conversation.</p>
        </div>
      </header>
      {start.isError && (
        <p className="error" role="alert">
          {start.error.message}
        </p>
      )}
      <section className="messages-list-section" aria-labelledby="conversations-title">
        <div className="messages-list-head">
          <div>
            <h2 id="conversations-title">Conversations</h2>
            <span className="muted">{q.data?.length ?? 0} connection{q.data?.length === 1 ? '' : 's'}</span>
          </div>
          {!!q.data?.length && (
            <label className="conversation-search">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                value={conversationSearch}
                onChange={(event) => setConversationSearch(event.target.value)}
                placeholder="Search conversations"
                aria-label="Search conversations"
              />
            </label>
          )}
        </div>
        {!q.data?.length ? (
          <div className="messages-empty panel card">
            <span className="messages-empty-icon"><Inbox size={24} aria-hidden="true" /></span>
            <strong>No conversations yet</strong>
            <p className="muted">Accepted connections will appear here.</p>
          </div>
        ) : !filteredConversations.length ? (
          <div className="messages-empty panel card">
            <span className="messages-empty-icon"><Search size={24} aria-hidden="true" /></span>
            <strong>No matching conversation</strong>
            <p className="muted">Try another name or message keyword.</p>
          </div>
        ) : (
          <div className="conversations">
          {filteredConversations.map((c) => {
            const other = c.participants.find((p) => p.userId !== me.data?.id);
            const name = other?.user?.profile?.firstName ?? 'Connection';
            const last = c.messages?.[0];
            const unread =
              last && last.senderId !== me.data?.id && last.status !== 'READ';
            return (
              <Link className={`conversation-row ${unread ? 'unread' : ''}`} key={c.id} href={`/app/messages/${c.id}`}>
                <span className="avatar">{initials(name)}</span>
                <span className="conversation-body">
                  <span className="conversation-name">
                    {name}
                    {unread && <small>New</small>}
                  </span>
                  <span className="conversation-preview">
                    {last?.senderId === me.data?.id ? 'You: ' : ''}{last?.content ?? 'Open conversation'}
                  </span>
                </span>
                <span className="conversation-meta">
                  {last && <small>{timeLabel(last.createdAt)}</small>}
                  {unread && <span className="unread-dot" aria-label="Unread" />}
                  <ChevronRight size={17} aria-hidden="true" />
                </span>
              </Link>
            );
          })}
          </div>
        )}
      </section>
      <section className="discover-section">
        <div className="discover-heading">
          <div>
            <div className="eyebrow">Discover</div>
            <h2 className="section-title">Meet the community</h2>
          </div>
          <p className="muted">Explore profiles and connect when someone catches your attention.</p>
        </div>
        {!people.length ? (
          <p className="muted">No new profiles are available right now.</p>
        ) : (
          <>
            <div className="discover-grid">
              {people.map((person) => (
                <article className="discover-card" key={person.id}>
                  <span className="avatar">{initials(person.profile.firstName)}</span>
                  <div className="discover-body">
                    <strong>
                      {person.profile.firstName}, {ageFrom(person.profile.birthDate)}
                    </strong>
                    <span className="discover-location">
                      <MapPin size={13} aria-hidden="true" />
                      {person.profile.city}, {person.profile.country}
                    </span>
                  </div>
                  <div className="discover-detail">
                    <BriefcaseBusiness size={14} aria-hidden="true" />
                    {person.profile.occupation || 'Occupation not shared'}
                  </div>
                  <div className="discover-actions">
                    <button
                      className="button small"
                      disabled={start.isPending}
                      onClick={() => start.mutate(person.id)}
                    >
                      <MessageCircle size={14} /> Message
                    </button>
                    <Link className="text-link small" href={`/app/people/${person.id}`}>
                      View profile <ArrowUpRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
            <nav className="discover-pagination" aria-label="Community profiles pagination">
              <button
                className="button secondary small"
                disabled={discoverPage === 0 || discover.isFetching}
                onClick={() => setDiscoverPage((page) => Math.max(0, page - 1))}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span aria-live="polite">Page {discoverPage + 1}</span>
              <button
                className="button secondary small"
                disabled={!hasNextPage || discover.isFetching}
                onClick={() => setDiscoverPage((page) => page + 1)}
              >
                Next <ChevronRight size={16} />
              </button>
            </nav>
          </>
        )}
      </section>
    </div>
  );
}
