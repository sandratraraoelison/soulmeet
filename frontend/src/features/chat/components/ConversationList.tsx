import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useConversations } from '../hooks/use-chat';
import { useChatStore } from '../store/chat.store';
import { ConversationItem } from './ConversationItem';

export function ConversationList({ currentUserId }: { currentUserId?: string }) {
  const query = useConversations(currentUserId);
  const typing = useChatStore((state) => state.typingByConversation);
  if (query.isLoading)
    return (
      <View className="mt-3 gap-3">
        {[0, 1].map((item) => (
          <View key={item} className="h-24 animate-pulse rounded-[20px] bg-surface" />
        ))}
      </View>
    );
  if (query.isError)
    return (
      <Pressable onPress={() => void query.refetch()} className="mt-3 rounded-2xl border border-border bg-surface p-5">
        <Text className="font-body text-sm text-muted">Unable to load conversations.</Text>
        <Text className="mt-2 font-label text-sm font-bold text-primary">Try again</Text>
      </Pressable>
    );
  if (!query.data?.length)
    return (
      <View className="mt-3 items-center rounded-[20px] border border-border bg-surface p-6">
        <Text className="text-2xl text-secondary">♡</Text>
        <Text className="mt-3 text-center font-body text-sm leading-6 text-muted">
          Your next connections will appear here. Soulmeet will introduce you to people who truly match you.
        </Text>
      </View>
    );
  return (
    <View className="mt-3 gap-3">
      {query.isFetching ? <ActivityIndicator color="#D4AF37" /> : null}
      {query.data.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          typing={Boolean(typing[conversation.id])}
        />
      ))}
      <Pressable accessibilityRole="button" onPress={() => void query.refetch()} className="min-h-11 items-center justify-center">
        <Text className="font-label text-xs font-semibold text-muted">Refresh conversations</Text>
      </Pressable>
    </View>
  );
}
