import { Pressable, Text, View } from 'react-native';
import { BackButton } from '@/components/navigation/BackButton';

interface Props {
  firstName: string;
  online: boolean;
  typing: boolean;
  onOpenProfile: () => void;
}

export function ConversationHeader({ firstName, online, typing, onOpenProfile }: Props) {
  const status = typing ? 'Typing…' : online ? 'Online' : 'Offline';
  return (
    <View className="border-b border-border bg-canvas px-4 pb-3 pt-2">
      <View className="flex-row items-center">
        <BackButton accessibilityLabel="Back to conversations" fallbackHref="/(app)/soul" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${firstName}'s profile`}
          accessibilityHint="Opens this person's public Soulmeet profile"
          onPress={onOpenProfile}
          className="ml-2 min-h-14 flex-1 flex-row items-center rounded-2xl px-2 active:bg-surface-raised"
        >
          <View className="relative h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/15">
            <Text className="font-headline text-lg font-bold text-primary">{firstName.slice(0, 1).toUpperCase()}</Text>
            <View className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-canvas ${online ? 'bg-emerald-400' : 'bg-muted'}`} />
          </View>
          <View className="ml-3 flex-1">
            <Text numberOfLines={1} className="font-headline text-lg font-bold text-ink">{firstName}</Text>
            <View className="mt-0.5 flex-row items-center">
              <Text className={`font-label text-xs font-semibold ${typing ? 'text-secondary' : online ? 'text-emerald-400' : 'text-muted'}`}>{status}</Text>
              <Text className="mx-2 text-xs text-muted">·</Text>
              <Text className="font-body text-xs text-muted">View profile</Text>
            </View>
          </View>
          <View className="h-9 w-9 items-center justify-center rounded-full bg-surface-raised">
            <Text className="text-xl text-primary">›</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}
