import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { Button } from '@/components/common/Button';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { Screen } from '@/components/common/Screen';
import { BackButton } from '@/components/navigation/BackButton';
import { chatApi } from '@/features/chat/api/chat.api';
import { chatKeys } from '@/features/chat/hooks/use-chat';
import type { User } from '@/types/models';

const genderLabels: Record<string, string> = {
  MALE: 'Man',
  FEMALE: 'Woman',
  NON_BINARY: 'Non-binary',
  NON_GENDERED: 'Non-binary',
  OTHER: 'Other',
  PREFER_NOT_TO_SAY: 'Not specified',
};

export default function PersonProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: () => chatApi.getPublicProfile(userId),
  });
  const startChat = useMutation({
    mutationFn: () => {
      const currentUser = queryClient.getQueryData<User>(['me']);
      return chatApi.createPrivateConversation(userId, currentUser?.id);
    },
    onSuccess: async (conversation) => {
      await queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
      router.push(`/(app)/conversation/${conversation.id}` as Href);
    },
  });

  if (query.isLoading)
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color="#D4AF37" />
      </View>
    );
  if (query.isError || !query.data)
    return (
      <Screen>
        <Text className="mt-10 font-body text-muted">This profile is no longer available.</Text>
        <View className="mt-5"><BackButton /></View>
      </Screen>
    );

  const profile = query.data.profile;
  return (
    <Screen>
      <View className="pb-8 pt-2">
        <BackButton accessibilityLabel="Back to conversation" />

        <View className="mt-8 items-center">
          <View className="h-28 w-28 items-center justify-center rounded-full border border-secondary/40 bg-secondary/10">
            <Text className="font-headline text-5xl font-bold text-secondary">
              {profile.firstName.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <Text className="mt-6 font-headline text-4xl font-bold text-ink">
            {profile.firstName}
          </Text>
          <Text className="mt-2 font-body text-base text-muted">
            {profile.city}, {profile.country}
          </Text>
        </View>

        <View className="mt-9 rounded-[24px] border border-border bg-surface p-6">
          <Text className="font-label text-xs font-bold uppercase tracking-[2px] text-secondary">
            Soulmeet profile
          </Text>
          <ProfileRow label="First name" value={profile.firstName} />
          <ProfileRow label="Location" value={`${profile.city}, ${profile.country}`} />
          {profile.occupation ? <ProfileRow label="Occupation" value={profile.occupation} /> : null}
          <ProfileRow label="Gender" value={genderLabels[profile.gender] ?? 'Not specified'} />
        </View>

        <View className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <Text className="font-body text-sm italic leading-6 text-muted">
            This person&apos;s private information remains protected. Only the public details needed for the connection are shown.
          </Text>
        </View>

        <View className="mt-6">
          <Button
            label={`Chat with ${profile.firstName}`}
            loading={startChat.isPending}
            onPress={() => startChat.mutate()}
          />
          <View className="mt-3">
            <ErrorMessage message={startChat.isError ? 'Unable to open this conversation. Please try again.' : null} />
          </View>
        </View>
      </View>
    </Screen>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mt-5 border-t border-border pt-4">
      <Text className="font-label text-[10px] font-bold uppercase tracking-wider text-muted">{label}</Text>
      <Text className="mt-1 font-body text-base font-semibold text-ink">{value}</Text>
    </View>
  );
}
