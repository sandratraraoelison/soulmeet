import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, type LoginInput, type RegisterInput } from '@/api/auth.api';
import { getErrorMessage } from '@/api/client';
import { profileApi } from '@/api/profile.api';
import { disconnectChatSocket } from '@/features/chat/services/chat.socket';
import { useChatStore } from '@/features/chat/store/chat.store';
import { diag } from '@/lib/diag';
import { tokenStorage } from '@/services/token-storage.service';
import { useAuthStore } from '@/store/auth.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import type { Tokens, User } from '@/types/models';

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
      diag.log(`STEP5 POST /auth/${provider} starts, identityTokenLen=${identityToken.length}`);
      let tokens: Tokens;
      try {
        tokens = await authApi[provider](identityToken);
      } catch (error) {
        diag.error(`STEP6 POST /auth/${provider} FAILED`, getErrorMessage(error), error);
        throw error;
      }
      diag.log(`STEP6 POST /auth/${provider} OK accessToken=${Boolean(tokens.accessToken)} refreshToken=${Boolean(tokens.refreshToken)} tokenType=${tokens.tokenType}`);
      diag.log('STEP7 tokens (JWT) received by mobile');
      // Profile and coach queries are keyed globally, so invalidating them can
      // leave the previous account's data available when a new social account
      // has no profile yet (the refetch then fails with 404). Remove that data
      // before exposing the new authenticated session to Navigation.
      queryClient.removeQueries({ queryKey: ['me'] });
      queryClient.removeQueries({ queryKey: ['profile'] });
      queryClient.removeQueries({ queryKey: ['coach'] });
      resetOnboarding();
      try {
        await tokenStorage.save(tokens);
      } catch (error) {
        diag.error('STEP8 tokenStorage.save() FAILED', error);
        throw error;
      }
      diag.log('STEP8 tokenStorage.save() done');
      diag.log('STEP9 authApi.me() starts');
      let me: User;
      try {
        me = await authApi.me();
      } catch (error) {
        diag.error('STEP10 authApi.me() FAILED', getErrorMessage(error), error);
        throw error;
      }
      diag.log(`STEP10 authApi.me() OK id=${me.id} email=${me.email} provider=${me.authProvider}`);
      return me;
    },
    onSuccess: (user) => {
      diag.log(`STEP11 setAuthenticated(${Boolean(user)})`);
      setAuthenticated(Boolean(user));
    },
    onError: (error) => {
      diag.error('SOCIAL mutation onError', getErrorMessage(error), error);
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
