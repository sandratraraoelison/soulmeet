import { Text, View } from 'react-native';
import { Screen } from '@/components/common/Screen';
import { AccountButton } from '@/components/navigation/AccountButton';
import { ConversationList } from '@/features/chat/components/ConversationList';

export default function MessagesScreen() {
  return (
    <Screen>
      <View className="pb-8 pt-3">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="font-headline text-3xl font-bold text-secondary">Messages</Text>
            <Text className="mt-1 text-xs font-bold uppercase tracking-[2px] text-muted">
              Your conversations
            </Text>
          </View>
          <AccountButton />
        </View>

        <View className="mt-8 flex-row items-end justify-between">
          <View>
            <Text className="font-headline text-xl font-bold text-ink">Your conversations</Text>
            <Text className="mt-1 text-sm text-muted">Continue where you left off.</Text>
          </View>
          <View className="rounded-full bg-primary/15 px-3 py-1.5">
            <Text className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Private
            </Text>
          </View>
        </View>
        <ConversationList />
      </View>
    </Screen>
  );
}
