import { memo } from 'react';
import { Image, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { API_URL } from '@/api/client';
import type { Message } from '../types/chat.types';

const statusLabel = {
  PENDING: 'Sending...',
  SENT: 'Sent',
  DELIVERED: 'Delivered',
  READ: 'Read',
  FAILED: 'Failed - Tap to try again',
} as const;

function AudioAttachment({ uri, durationMs }: { uri: string; durationMs: number | null }) {
  const player = useAudioPlayer({ uri: mediaUrl(uri) });
  const status = useAudioPlayerStatus(player);
  const toggle = () => {
    if (status.playing) player.pause();
    else {
      if (status.currentTime >= status.duration) void player.seekTo(0);
      player.play();
    }
  };
  const seconds = Math.max(0, Math.round((durationMs ?? status.duration * 1000) / 1000));
  const progress = status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={status.playing ? 'Pause voice message' : 'Play voice message'} onPress={toggle} className="min-w-48 flex-row items-center rounded-xl bg-black/15 px-3 py-3">
      <View className="h-11 w-11 items-center justify-center rounded-full bg-white/20">
        <MaterialCommunityIcons name={status.playing ? 'pause' : 'play'} size={25} color="#FFFFFF" />
      </View>
      <View className="mx-3 flex-1">
        <View className="h-1.5 overflow-hidden rounded-full bg-white/25">
          <View className="h-full rounded-full bg-white" style={{ width: `${progress * 100}%` }} />
        </View>
        <Text className="mt-2 text-[10px] text-white/80">Voice message</Text>
      </View>
      <Text className="text-xs text-white">{formatDuration(seconds)}</Text>
    </Pressable>
  );
}

function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  mine,
  onLongPress,
  onRetry,
  onImagePress,
}: {
  message: Message;
  mine: boolean;
  onLongPress?: () => void;
  onRetry?: () => void;
  onImagePress?: () => void;
}) {
  const { width } = useWindowDimensions();
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const deleted = message.isDeleted;
  const photoUri = message.mediaUrl ? mediaUrl(message.mediaUrl) : null;
  const photoWidth = Math.min(280, width * 0.72);
  const label = `${message.type.toLowerCase()} message ${mine ? 'sent by you' : 'received'} at ${time}, ${message.status.toLowerCase()}${message.isEdited ? ', edited' : ''}${deleted ? ', deleted' : ''}.`;
  return (
    <Pressable
      accessibilityRole="text"
      accessibilityLabel={label}
      onLongPress={!deleted ? onLongPress : undefined}
      onPress={message.status === 'FAILED' ? onRetry : message.type === 'IMAGE' ? onImagePress : undefined}
      className={`mb-2 max-w-[82%] overflow-hidden rounded-2xl border px-3 py-3 ${mine ? 'ml-auto rounded-br-sm border-primary bg-primary' : 'mr-auto rounded-bl-sm border-border bg-surface'} ${deleted ? 'opacity-60' : ''}`}
    >
      {deleted ? <Text className="font-body italic text-muted">This message was deleted</Text> : null}
      {!deleted && message.type === 'IMAGE' && message.mediaUrl ? (
        <View className="overflow-hidden rounded-xl bg-black/30">
          <Image accessibilityLabel="Photo attachment" source={{ uri: photoUri! }} resizeMode="cover" style={{ width: photoWidth, height: Math.round(photoWidth * 0.78) }} />
        </View>
      ) : null}
      {!deleted && message.type === 'AUDIO' && message.mediaUrl ? (
        <AudioAttachment uri={message.mediaUrl} durationMs={message.mediaDurationMs} />
      ) : null}
      {!deleted && message.type === 'TEXT' ? (
        <Text className={`font-body text-base leading-6 ${mine ? 'text-white' : 'text-ink'}`}>{message.content}</Text>
      ) : null}
      <View className="mt-1 flex-row items-center justify-end gap-2">
        <Text className={`font-label text-[10px] ${mine ? 'text-indigo-100' : 'text-muted'}`}>{time}{message.isEdited ? ' - Edited' : ''}</Text>
        {mine ? <Text className={`font-label text-[10px] ${message.status === 'READ' ? 'text-secondary' : message.status === 'FAILED' ? 'text-danger' : 'text-indigo-100'}`}>{statusLabel[message.status]}</Text> : null}
      </View>
    </Pressable>
  );
});

export function mediaUrl(value: string) {
  try {
    const media = new URL(value);
    if (media.hostname !== 'localhost' && media.hostname !== '127.0.0.1') return value;
    const api = new URL(API_URL);
    media.protocol = api.protocol;
    media.hostname = api.hostname;
    media.port = api.port;
    return media.toString();
  } catch {
    const base = API_URL.replace(/\/api\/v1\/?$/, '');
    return `${base}/${value.replace(/^\//, '')}`;
  }
}
