'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, X } from 'lucide-react';
import { api } from '@/services/api';
import type { MatchDecision } from '@/types';
import { Failure, Loading } from '@/components/remote';

export default function SoulHistory() {
  const history = useQuery({
    queryKey: ['matches', 'history'],
    queryFn: () => api<MatchDecision[]>('/users/matches/history'),
  });

  if (history.isLoading) return <div className="page"><Loading /></div>;
  if (history.isError)
    return <div className="page"><Failure retry={() => void history.refetch()} /></div>;

  const accepted = (history.data ?? []).filter((item) => item.response === 'ACCEPTED');
  const passed = (history.data ?? []).filter((item) => item.response === 'REJECTED');

  return (
    <div className="page soul-history-page">
      <Link className="text-link profile-back" href="/app/soul">
        <ArrowLeft size={17} /> Back to Soul
      </Link>
      <header className="page-head">
        <div>
          <div className="eyebrow">Soul history</div>
          <h1>Your match decisions</h1>
          <p className="muted">Review the connections you accepted or decided not to pursue.</p>
        </div>
      </header>
      <div className="soul-history-page-grid">
        <HistoryList id="accepted" title="Accepted matches" items={accepted} icon={<Check size={17} />} />
        <HistoryList id="passed" title="Passed matches" items={passed} icon={<X size={17} />} />
      </div>
    </div>
  );
}

function HistoryList({ id, title, items, icon }: { id: string; title: string; items: MatchDecision[]; icon: React.ReactNode }) {
  return (
    <section className="soul-history-full" id={id}>
      <div className="soul-history-full-head"><span>{icon}</span><h2>{title}</h2><small>{items.length}</small></div>
      {!items.length ? <p className="muted">No profiles in this list yet.</p> : (
        <div className="stack">
          {items.map((item) => (
            <Link className="panel card soul-history-row" href={`/app/people/${item.userId}`} key={`${item.userId}-${item.respondedAt}`}>
              <div><strong>{item.name}, {item.age}</strong><p className="muted">{item.job || 'Occupation not shared'} · {item.city}, {item.country}</p></div>
              <time dateTime={item.respondedAt}>{new Date(item.respondedAt).toLocaleDateString()}</time>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
