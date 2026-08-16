import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { profileApi } from '@/api/profile.api';
import { LoadingScreen } from '@/components/common/LoadingScreen';
export default function OnboardingIndex() {
  const profile = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.get,
    retry: false,
  });
  if (profile.isPending) return <LoadingScreen />;
  return (
    <Redirect
      href={profile.data ? '/(onboarding)/companion' : '/(onboarding)/profile'}
    />
  );
}
