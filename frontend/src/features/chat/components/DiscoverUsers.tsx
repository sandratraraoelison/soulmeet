import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { chatApi } from '../api/chat.api';
import { chatKeys } from '../hooks/use-chat';

export function DiscoverUsers({ currentUserId }: { currentUserId?: string }) {
  const queryClient = useQueryClient();
  const users = useQuery({
    queryKey: ['chat', 'discover-users'],
    queryFn: chatApi.getDiscoverableUsers,
  });
  const start = useMutation({
    mutationFn: (participantId: string) =>
      chatApi.createPrivateConversation(participantId, currentUserId),
    onSuccess: async (conversation) => {
      await queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
      router.push(`/(app)/conversation/${conversation.id}` as Href);
    },
  });

  if (users.isLoading)
    return <ActivityIndicator className="mt-4" color="#D4AF37" />;
  if (users.isError)
    return (
      <Pressable onPress={() => void users.refetch()} className="mt-3 rounded-2xl border border-border bg-surface p-4">
        <Text className="font-body text-sm text-muted">Unable to load accounts.</Text>
        <Text className="mt-2 font-label text-sm font-bold text-primary">Try again</Text>
      </Pressable>
    );
  if (!users.data?.length)
    return (
      <Text className="mt-3 font-body text-sm leading-5 text-muted">
        No other complete profiles are available right now.
      </Text>
    );

  return (
    <View className="mt-3 gap-3">
      {users.data.map((user) => {
        const loading = start.isPending && start.variables === user.id;
        return (
          <Pressable
            key={user.id}
            accessibilityRole="button"
            accessibilityLabel={`Chat with ${user.profile.firstName}`}
            disabled={start.isPending}
            onPress={() => start.mutate(user.id)}
            className="flex-row items-center rounded-[20px] border border-secondary/30 bg-surface p-4 active:bg-surface-raised"
          >
            <View className="h-12 w-12 items-center justify-center rounded-full bg-secondary/15">
              <Text className="font-headline text-lg font-bold text-secondary">
                {user.profile.firstName.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View className="ml-4 flex-1">
              <Text className="font-headline text-base font-bold text-ink">
                {user.profile.firstName}
              </Text>
              <Text className="mt-1 font-body text-xs text-muted">
                {user.profile.city}, {user.profile.country}
              </Text>
            </View>
            {loading ? (
              <ActivityIndicator color="#D4AF37" />
            ) : (
              <View className="rounded-full bg-primary px-3 py-2">
                <Text className="font-label text-xs font-bold text-white">Ouvrir le chat</Text>
              </View>
            )}
          </Pressable>
        );
      })}
      {start.isError ? (
        <Text accessibilityRole="alert" className="font-body text-xs text-danger">
          Unable to open this conversation. Please try again in a moment.
        </Text>
      ) : null}
    </View>
  );
}
