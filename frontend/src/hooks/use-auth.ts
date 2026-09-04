import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, type LoginInput, type RegisterInput } from '@/api/auth.api';
import { profileApi } from '@/api/profile.api';
import { disconnectChatSocket } from '@/features/chat/services/chat.socket';
import { useChatStore } from '@/features/chat/store/chat.store';
import { tokenStorage } from '@/services/token-storage.service';
import { useAuthStore } from '@/store/auth.store';
import { useOnboardingStore } from '@/store/onboarding.store';

export function useEmailAuth(mode: 'login' | 'register') {
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput | RegisterInput) =>
      mode === 'register'
        ? authApi.register(input as RegisterInput)
        : authApi.login(input),
    onSuccess: async (tokens) => {
      await tokenStorage.save(tokens);
      const user = await queryClient.fetchQuery({
        queryKey: ['me'],
        queryFn: authApi.me,
      });
      if (mode === 'register') {
        await queryClient.fetchQuery({
          queryKey: ['profile'],
          queryFn: profileApi.get,
        });
        queryClient.setQueryData(['coach'], null);
      }
      setAuthenticated(Boolean(user));
    },
  });
}

export function useSocialAuth(provider: 'google' | 'apple') {
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const resetOnboarding = useOnboardingStore((state) => state.reset);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (identityToken: string) => {
      const tokens = await authApi[provider](identityToken);
      // Profile and coach queries are keyed globally, so invalidating them can
      // leave the previous account's data available when a new social account
      // has no profile yet (the refetch then fails with 404). Remove that data
      // before exposing the new authenticated session to Navigation.
      queryClient.removeQueries({ queryKey: ['me'] });
      queryClient.removeQueries({ queryKey: ['profile'] });
      queryClient.removeQueries({ queryKey: ['coach'] });
      resetOnboarding();
      await tokenStorage.save(tokens);
      return authApi.me();
    },
    onSuccess: (user) => setAuthenticated(Boolean(user)),
  });
}
export function useLogout() {
  const reset = useAuthStore((state) => state.reset);
  const resetOnboarding = useOnboardingStore((state) => state.reset);
  const queryClient = useQueryClient();
  const resetChat = useChatStore((state) => state.reset);
  return useMutation({
    mutationFn: async () => {
      const { refreshToken } = await tokenStorage.get();
      if (refreshToken) {
        try {
          await authApi.logout(refreshToken);
        } catch {
          /* Local logout must always succeed. */
        }
      }
    },
    onSettled: async () => {
      disconnectChatSocket();
      await tokenStorage.clear();
      queryClient.clear();
      resetOnboarding();
      resetChat();
      reset();
    },
  });
}
