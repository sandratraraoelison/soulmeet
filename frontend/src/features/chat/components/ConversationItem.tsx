import { memo } from 'react';
import { router, type Href } from 'expo-router';
import { Text, View } from 'react-native';
import { MotionPressable } from '@/components/motion/MotionPressable';
import type { Conversation } from '../types/chat.types';

export const ConversationItem = memo(function ConversationItem({
  conversation,
  typing = false,
}: {
  conversation: Conversation;
  typing?: boolean;
}) {
  const last = conversation.lastMessage;
  const preview = typing
    ? 'typing…'
    : last?.isDeleted
      ? 'Deleted message'
      : last?.content ?? 'Start the conversation';
  const date = conversation.lastMessageAt
    ? new Date(conversation.lastMessageAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={`Conversation with ${conversation.otherParticipant.firstName}`}
      onPress={() =>
        router.push(`/(app)/conversation/${conversation.id}` as Href)
      }
      className={`flex-row items-center rounded-[20px] border bg-surface p-4 active:bg-surface-raised ${conversation.unreadCount > 0 ? 'border-primary/50' : 'border-border'}`}
    >
      <View className="relative h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/15">
        <Text className="font-headline text-xl font-bold text-primary">
          {conversation.otherParticipant.firstName.slice(0, 1).toUpperCase()}
        </Text>
        {typing ? <View className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-surface bg-secondary" /> : null}
      </View>
      <View className="ml-4 flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="font-headline text-base font-bold text-ink">
            {conversation.otherParticipant.firstName}
          </Text>
          <Text className="font-label text-[10px] text-muted">{date}</Text>
        </View>
        <View className="mt-1 flex-row items-center">
          <Text
            numberOfLines={1}
            className={`flex-1 font-body text-sm ${typing ? 'italic text-secondary' : 'text-muted'}`}
          >
            {preview}
          </Text>
          {conversation.unreadCount > 0 ? (
            <View className="ml-3 min-w-5 items-center rounded-full bg-secondary px-1.5 py-0.5">
              <Text className="font-label text-[10px] font-bold text-[#25262E]">
                {conversation.unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </MotionPressable>
  );
});
