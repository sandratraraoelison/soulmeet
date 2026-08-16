import { Pressable, Text, View } from 'react-native';
import type { GuidanceMessage } from '../types/guidance.types';

export function GuidanceMessageBubble({ message, onLongPress }: { message: GuidanceMessage; onLongPress?: () => void }) {
  const mine = message.role === 'USER';
  return (
    <Pressable accessibilityRole="text" onLongPress={onLongPress} className={`mb-3 max-w-[86%] rounded-[20px] px-4 py-3 ${mine ? 'ml-auto rounded-br-sm bg-primary' : 'mr-auto rounded-bl-sm border border-border bg-surface'}`}>
      <Text className={`font-body text-base leading-6 ${mine ? 'text-white' : 'text-ink'} ${message.isDeleted ? 'italic' : ''}`}>{message.isDeleted ? 'This message was deleted' : message.content}</Text>
      <View className="mt-2 flex-row justify-end"><Text className={`font-label text-[10px] ${mine ? 'text-indigo-100' : 'text-muted'}`}>{message.isEdited ? 'Edited · ' : ''}{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></View>
    </Pressable>
  );
}
