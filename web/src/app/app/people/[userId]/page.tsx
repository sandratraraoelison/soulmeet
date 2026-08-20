'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Briefcase, Heart, MapPin, MessageCircle, Sparkles } from 'lucide-react';
import { api, json } from '@/services/api';
import type { Conversation, PublicProfile } from '@/types';
import { Failure, Loading } from '@/components/remote';
import { categoryMeta } from '@/features/soulprint/constants';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
const ageFrom = (birthDate: string) => {
  const born = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const m = now.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age--;
  return age;
};
const genderLabel = (gender: string) => gender.replaceAll('_', ' ').toLowerCase();

export default function Person() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const q = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: () => api<PublicProfile>(`/users/${userId}/public-profile`),
  });
  const start = useMutation({
    mutationFn: () =>
      api<Conversation>('/conversations/private', json('POST', { participantId: userId })),
    onSuccess: (c) => router.push(`/app/messages/${c.id}`),
  });
  if (q.isLoading)
    return (
      <div className="page">
        <Loading />
      </div>
    );
  if (q.isError || !q.data)
    return (
      <div className="page">
        <Failure retry={() => void q.refetch()} />
      </div>
    );
  const p = q.data.profile;
  const age = p.birthDate ? ageFrom(p.birthDate) : null;
  const grouped = new Map<string, typeof q.data.soulprint>();
  for (const entry of q.data.soulprint) {
    const bucket = grouped.get(entry.category) ?? [];
    bucket.push(entry);
    grouped.set(entry.category, bucket);
  }
  return (
    <div className="page profile-page">
      <Link className="text-link profile-back" href="/app/messages">
        <ArrowLeft size={17} aria-hidden="true" /> Back to messages
      </Link>
      <section className="profile-hero">
        <div className="profile-avatar" aria-hidden="true">
          {initials(p.firstName)}
        </div>
        <div className="profile-hero-body">
          <div className="eyebrow">Connection profile</div>
          <h1>
            {p.firstName}
            {age ? `, ${age}` : ''}
          </h1>
          <p className="meta">
            {genderLabel(p.gender)}
            {p.sexualOrientation && p.sexualOrientation !== 'PREFER_NOT_TO_SAY'
              ? ` · ${genderLabel(p.sexualOrientation)}`
              : ''}
          </p>
          <div className="profile-facts">
            <span>
              <MapPin size={14} /> {p.city}, {p.country}
            </span>
            {p.occupation && (
              <span>
                <Briefcase size={14} /> {p.occupation}
              </span>
            )}
          </div>
        </div>
        <button
          className="button profile-hero-action"
          disabled={start.isPending}
          onClick={() => start.mutate()}
        >
          <MessageCircle size={18} />
          {start.isPending ? 'Opening…' : `Message ${p.firstName}`}
        </button>
      </section>
      {q.data.compatibility && (
        <section className="profile-panel profile-match">
          <div className="profile-score" aria-label={`${q.data.compatibility.score}% compatibility`}>
            <strong>{q.data.compatibility.score}%</strong>
            <span>match score</span>
          </div>
          <div className="profile-match-body">
            <div className="eyebrow">
              <Sparkles size={13} aria-hidden="true" />
              {q.data.compatibility.compatibilityType}
            </div>
            <ul className="profile-reasons">
              {q.data.compatibility.reasons.map((reason) => (
                <li key={reason}>
                  <Heart size={12} /> {reason}
                </li>
              ))}
            </ul>
            <div className="profile-range">
              <span>Estimated range</span>
              <strong>
                {q.data.compatibility.scoreMin}–{q.data.compatibility.scoreMax}%
              </strong>
            </div>
          </div>
        </section>
      )}
      {q.data.soulprint.length > 0 && (
        <section>
          <h2 className="profile-section-title">
            What {p.firstName} shared{q.data.compatibility ? ' · you both share:' : ''}
          </h2>
          <div className="profile-groups">
            {[...grouped].map(([category, entries]) => {
              const meta = categoryMeta[category] ?? { label: category, icon: '•' };
              return (
                <div className="profile-group" key={category}>
                  <div className="profile-group-label">
                    {meta.icon} {meta.label}
                  </div>
                  <div className="profile-chips">
                    {entries.map((entry, i) => (
                      <span
                        className={entry.shared ? 'chip shared' : 'chip'}
                        title={entry.shared ? 'You both shared this' : undefined}
                        key={`${category}-${entry.value}-${i}`}
                      >
                        {entry.shared && <Heart size={12} aria-hidden="true" />} {entry.value}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
      {start.isError && (
        <p className="error" role="alert">
          {start.error.message}
        </p>
      )}
    </div>
  );
}
