import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { profileApi } from '@/api/profile.api';
import { LoadingScreen } from '@/components/common/LoadingScreen';

function hasRequiredProfileFields(profile: Record<string, unknown> | undefined): boolean {
  if (!profile) return false;
  return Boolean(
    profile.firstName && profile.birthDate && profile.gender && profile.country && profile.city,
  );
}

export default function OnboardingIndex() {
  const [profileLoadTimedOut, setProfileLoadTimedOut] = useState(false);
  const profile = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.get,
    retry: false,
  });
  useEffect(() => {
    setProfileLoadTimedOut(false);
    if (!profile.isPending) return;
    const timer = setTimeout(() => setProfileLoadTimedOut(true), 15_000);
    return () => clearTimeout(timer);
  }, [profile.isPending]);

  if (profile.isPending && !profileLoadTimedOut) return <LoadingScreen />;
  const complete = hasRequiredProfileFields(profile.data as Record<string, unknown> | undefined);
  return (
    <Redirect
      href={complete ? '/(onboarding)/companion' : '/(onboarding)/profile'}
    />
  );
}
