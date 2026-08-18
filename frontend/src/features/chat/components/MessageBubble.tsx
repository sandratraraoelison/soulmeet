import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Message } from '../types/chat.types';

const statusLabel = {
  PENDING: 'Envoi…',
  SENT: '✓',
  DELIVERED: '✓✓',
  READ: '✓✓',
  FAILED: 'Failed · Tap to try again',
} as const;

export const MessageBubble = memo(function MessageBubble({
  message,
  mine,
  onLongPress,
  onRetry,
}: {
  message: Message;
  mine: boolean;
  onLongPress?: () => void;
  onRetry?: () => void;
}) {
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const deleted = message.isDeleted;
  const label = `Message ${mine ? 'sent by you' : 'received'} at ${time}, ${message.status.toLowerCase()}${message.isEdited ? ', edited' : ''}${deleted ? ', deleted' : ''}.`;
  return (
    <Pressable
      accessibilityRole="text"
      accessibilityLabel={label}
      onLongPress={!deleted ? onLongPress : undefined}
      onPress={message.status === 'FAILED' ? onRetry : undefined}
      className={`mb-2 max-w-[82%] rounded-2xl border px-4 py-3 ${mine ? 'ml-auto rounded-br-sm border-primary bg-primary' : 'mr-auto rounded-bl-sm border-border bg-surface'} ${deleted ? 'opacity-60' : ''}`}
    >
      <Text className={`font-body text-base leading-6 ${mine ? 'text-white' : 'text-ink'} ${deleted ? 'italic' : ''}`}>
        {deleted ? 'This message was deleted' : message.content}
      </Text>
      <View className="mt-1 flex-row items-center justify-end gap-2">
        <Text className={`font-label text-[10px] ${mine ? 'text-indigo-100' : 'text-muted'}`}>
          {time}{message.isEdited ? ' · Edited' : ''}
        </Text>
        {mine ? (
          <Text className={`font-label text-[10px] ${message.status === 'READ' ? 'text-secondary' : message.status === 'FAILED' ? 'text-danger' : 'text-indigo-100'}`}>
            {statusLabel[message.status]}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});
