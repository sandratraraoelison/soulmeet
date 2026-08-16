import { Redirect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { getSessionRoute } from '@/lib/session-route';
import { useAuthStore } from '@/store/auth.store';
import type { Coach, Profile } from '@/types/models';

export default function Index() {
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const profile = queryClient.getQueryData<Profile>(['profile']);
  const coach = queryClient.getQueryData<Coach>(['coach']);
  return (
    <Redirect
      href={getSessionRoute(
        authenticated,
        Boolean(profile?.onboardingCompleted),
        Boolean(coach),
      )}
    />
  );
}
