'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Pencil } from 'lucide-react';
import { ApiError } from '@/services/api';
import { guidanceService } from '@/services/guidance';
import { profileService } from '@/services/profile';
import { Failure, Loading } from '@/components/remote';
import { coachFace, coachFacePosition } from '@/features/coach/coach-faces';

export function CoachHome() {
  const router = useRouter();
  const profile = useQuery({ queryKey: ['profile'], queryFn: profileService.get });
  const coach = useQuery({ queryKey: ['coach'], queryFn: guidanceService.coach });
  const suggestion = useQuery({
    queryKey: ['guidance', 'suggestion'],
    queryFn: guidanceService.suggestion,
  });
  useEffect(() => {
    if (coach.error instanceof ApiError && coach.error.status === 404) {
      router.replace('/onboarding');
    }
  }, [coach.error, router]);
  if (profile.isLoading || coach.isLoading)
    return (
      <div className="page">
        <Loading />
      </div>
    );
  if (profile.isError || coach.isError || !coach.data || !profile.data)
    return (
      <div className="page">
        <Failure
          retry={() => void Promise.all([profile.refetch(), coach.refetch()])}
        />
      </div>
    );
  const traits = (coach.data.traits.length ? coach.data.traits : []).slice(0, 3);
  const face = coachFace(coach.data.appearance);
  return (
    <div className="page">
      <header className="coach-home-head">
        <div>
          <div className="eyebrow">Guidance</div>
          <h1>Hello, {profile.data.firstName}</h1>
          <p className="muted">A space to think, feel, and move forward.</p>
        </div>
      </header>
      <Link className="coach-identity" href="/app/profile/coach">
        <div
          className="coach-avatar coach-avatar-face"
          style={{
            backgroundImage: "url('/coach-faces-v2.png')",
            ...coachFacePosition(face),
          }}
          aria-hidden="true"
        />
        <div>
          <div className="eyebrow">Your coach</div>
          <h2>{coach.data.name}</h2>
          <p className="muted">Here to listen, reflect, and help you move forward.</p>
        </div>
        {traits.length > 0 && (
          <div className="coach-identity-traits">
            {traits.map((trait) => (
              <span className="chip" key={trait}>
                {trait.toLowerCase().replaceAll('_', ' ')}
              </span>
            ))}
          </div>
        )}
        <span className="coach-identity-edit">
          View and edit <Pencil size={13} />
        </span>
      </Link>
      <section className="panel card coach-suggestion">
        <div className="eyebrow">{coach.data.name}</div>
        <p>
          {suggestion.data?.message ??
            `Hey ${profile.data.firstName}, how are you doing today? Tell me one interesting thing about you or your dating life.`}
        </p>
        <button className="button" onClick={() => router.push('/app/coach/chat')}>
          Talk to {coach.data.name}
          <ArrowRight size={18} />
        </button>
        <Link className="coach-archive-link" href="/app/coach/archive">
          Look back at everything you and your coach talked about <ArrowRight size={14} />
        </Link>
      </section>
    </div>
  );
}
