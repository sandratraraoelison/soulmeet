import { router, type Href } from 'expo-router';
import { ActivityIndicator, Alert, FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '@/components/navigation/BackButton';
import { GuidanceConversationCard } from '@/features/guidance/components/GuidanceConversationCard';
import { useArchiveGuidanceConversation, useDeleteGuidanceConversation, useGuidanceConversations } from '@/features/guidance/hooks/use-guidance';

export default function GuidanceHistoryScreen() {
  const query = useGuidanceConversations();
  const archive = useArchiveGuidanceConversation();
  const remove = useDeleteGuidanceConversation();
  const conversations = query.data?.pages.flatMap((page) => page.conversations) ?? [];
  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <View className="flex-row items-center px-5 py-4">
        <BackButton fallbackHref="/(app)/home" />
        <Text className="ml-4 flex-1 font-headline text-2xl font-bold text-ink">Guidance history</Text>
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, flexGrow: 1 }}
        renderItem={({ item }) => (
          <GuidanceConversationCard
            conversation={item}
            onPress={() => router.push(`/(app)/guidance/${item.id}` as Href)}
            onLongPress={() => Alert.alert(item.title || 'Conversation', undefined, [
              { text: 'Archive', onPress: () => archive.mutate(item.id) },
              { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(item.id) },
              { text: 'Cancel', style: 'cancel' },
            ])}
          />
        )}
        onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && void query.fetchNextPage()}
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color="#6366F1" /> : null}
        ListEmptyComponent={!query.isLoading ? <Text className="text-center font-body text-muted">No conversations yet.</Text> : null}
      />
    </SafeAreaView>
  );
}
