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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (identityToken: string) => authApi[provider](identityToken),
    onSuccess: async (tokens) => {
      await tokenStorage.save(tokens);
      const user = await queryClient.fetchQuery({
        queryKey: ['me'],
        queryFn: authApi.me,
      });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      await queryClient.invalidateQueries({ queryKey: ['coach'] });
      setAuthenticated(Boolean(user));
    },
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
