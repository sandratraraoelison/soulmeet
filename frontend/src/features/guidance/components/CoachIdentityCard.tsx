import { Text, View } from 'react-native';
import { MotionPressable } from '@/components/motion/MotionPressable';
import type { Coach } from '@/types/models';
import { CoachFaceAvatar } from '@/features/coach/components/CoachFaceAvatar';

export function CoachIdentityCard({ coach, onPress }: { coach: Coach; onPress?: () => void }) {
  const traits = (coach.traits.length ? coach.traits : coach.personality ? [coach.personality] : []).slice(0, 3);
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel="View and edit coach"
      onPress={onPress}
      className="rounded-[28px] border border-primary/30 bg-surface p-5 active:bg-surface-raised"
    >
      <View className="flex-row items-center">
        <CoachFaceAvatar appearance={coach.appearance} name={coach.name} size={64} />
        <View className="ml-4 flex-1">
          <Text className="font-label text-xs font-bold uppercase tracking-[2px] text-secondary">Your coach</Text>
          <Text className="mt-1 font-headline text-2xl font-bold text-ink">{coach.name}</Text>
          <Text className="mt-1 font-body text-sm text-muted">Here to listen, reflect, and help you move forward.</Text>
        </View>
      </View>
      <View className="mt-4 flex-row flex-wrap gap-2">
        {traits.map((trait) => (
          <View key={trait} className="rounded-full bg-primary/15 px-3 py-2">
            <Text className="font-label text-xs font-semibold capitalize text-primary">{trait.toLowerCase().replaceAll('_', ' ')}</Text>
          </View>
        ))}
      </View>
      <Text className="mt-4 font-label text-xs font-bold text-primary">View and edit</Text>
    </MotionPressable>
  );
}
