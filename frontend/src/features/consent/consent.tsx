import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { BackHandler, Modal, ScrollView, Text, View } from 'react-native';
import { apiClient } from '@/api/client';
import { Button } from '@/components/common/Button';

export type SoulprintConsent = { hasChoice: boolean; conversationAnalysisAllowed: boolean; consentVersion: string; consentedAt: string | null; withdrawnAt: string | null; analysisAllowedFrom: string | null; lastChangedAt: string | null };
export const consentKey = ['soulprint', 'consent'] as const;
export const consentApi = {
  get: async () => (await apiClient.get<SoulprintConsent>('/soulprint/consent')).data,
  update: async (conversationAnalysisAllowed: boolean) => (await apiClient.put<SoulprintConsent>('/soulprint/consent', { conversationAnalysisAllowed })).data,
  removeInsights: async () => (await apiClient.delete<{ removed: number }>('/soulprint/conversation-insights')).data,
};
export const useSoulprintConsent = (enabled = true) => useQuery({ queryKey: consentKey, queryFn: consentApi.get, enabled, retry: false, staleTime: Infinity });
export function useUpdateSoulprintConsent() {
  const client = useQueryClient();
  return useMutation({ mutationFn: consentApi.update, onSuccess: (data) => client.setQueryData(consentKey, data) });
}

export function SoulprintConsentPrompt({ enabled }: { enabled: boolean }) {
  const query = useSoulprintConsent(enabled);
  const update = useUpdateSoulprintConsent();
  useEffect(() => {
    if (!enabled || query.data?.hasChoice) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [enabled, query.data?.hasChoice]);
  if (!enabled || query.isPending || query.data?.hasChoice) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => undefined} statusBarTranslucent>
      <View className="flex-1 justify-center bg-black/80 px-4 py-8">
        <ScrollView contentContainerClassName="grow justify-center" keyboardShouldPersistTaps="handled">
          <View className="rounded-[28px] border border-border bg-surface p-6">
            {query.isError ? <View className="items-center py-6"><Text accessibilityRole="alert" className="mb-4 text-center text-danger">We could not load your privacy choice.</Text><Button label="Try again" onPress={() => void query.refetch()} /></View> : <>
            <Text accessibilityRole="header" className="font-headline text-2xl font-bold text-ink">Make your Soulprint even more accurate</Text>
            <Text className="mt-4 text-sm leading-6 text-muted">Your Soulprint becomes more accurate as Soulmeet learns about your personality, communication style, values, interests and relationship preferences.</Text>
            <Text className="mt-3 text-sm leading-6 text-muted">You can allow Soulmeet AI to learn from your conversations with other people on Soulmeet. Real conversations often reveal small but meaningful details that a traditional questionnaire cannot capture.</Text>
            <Text className="mt-3 text-sm leading-6 text-muted">If you allow access, the AI will analyze relevant patterns from your conversations to improve your Soulprint. This analysis is automated: only the AI ever accesses your messages, and no human will ever read your conversations. The AI only learns from your own messages, never from what the people you talk to have written. Your private messages will not be displayed in your Soulprint, and Soulmeet will never send messages or speak on your behalf.</Text>
            <Text className="mt-3 text-sm leading-6 text-muted">If you prefer not to allow access, that’s completely fine. Your AI Coach will occasionally ask you questions and request feedback directly so your Soulprint can still evolve and become more accurate over time.</Text>
            <Choice title="Allow AI to learn from my conversations" description="Soulmeet AI can analyze relevant patterns from my new conversations to better understand my communication style, interests, values and relationship preferences." label="Allow and continue" disabled={update.isPending} onPress={() => update.mutate(true)} />
            <Choice title="Keep my conversations private" description="Soulmeet will not use my conversations with other users to build my Soulprint. My AI Coach may occasionally ask me questions and request feedback instead." label="Continue without conversation access" disabled={update.isPending} onPress={() => update.mutate(false)} secondary />
            {update.isError ? <View className="mt-4"><Text accessibilityRole="alert" className="mb-3 text-sm text-danger">We could not save your choice. Please try again.</Text><Button label="Try again" variant="secondary" onPress={() => update.reset()} /></View> : null}
            <Text className="mt-5 text-center text-xs leading-5 text-muted">You can change this choice at any time in AI &amp; Soulprint Privacy settings.</Text>
            </>}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Choice({ title, description, label, onPress, disabled, secondary = false }: { title: string; description: string; label: string; onPress: () => void; disabled: boolean; secondary?: boolean }) {
  return <View className="mt-5 rounded-2xl border border-border bg-surface-raised p-4"><Text className="font-headline text-base font-bold text-ink">{title}</Text><Text className="mb-4 mt-2 text-sm leading-5 text-muted">{description}</Text><Button label={label} variant={secondary ? 'secondary' : 'primary'} disabled={disabled} loading={disabled} onPress={onPress} /></View>;
}
