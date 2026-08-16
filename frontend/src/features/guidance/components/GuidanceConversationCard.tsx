import { Text, View } from 'react-native';
import { MotionPressable } from '@/components/motion/MotionPressable';
import type { GuidanceConversation } from '../types/guidance.types';

export function GuidanceConversationCard({ conversation, onPress, onLongPress }: { conversation: GuidanceConversation; onPress: () => void; onLongPress?: () => void }) {
  const preview = conversation.messages?.[0]?.content;
  return (
    <MotionPressable accessibilityRole="button" onPress={onPress} onLongPress={onLongPress} className="mb-3 rounded-[20px] border border-border bg-surface p-4 active:bg-surface-raised">
      <View className="flex-row items-center justify-between">
        <Text numberOfLines={1} className="mr-3 flex-1 font-headline text-base font-bold text-ink">{conversation.title || 'New conversation'}</Text>
        <Text className="font-label text-xs text-muted">{conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleDateString() : ''}</Text>
      </View>
      {preview ? <Text numberOfLines={1} className="mt-2 font-body text-sm text-muted">{preview}</Text> : null}
    </MotionPressable>
  );
}
