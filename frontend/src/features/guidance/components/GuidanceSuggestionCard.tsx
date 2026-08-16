import { Text, View } from 'react-native';
import { MotionPressable } from '@/components/motion/MotionPressable';
import type { GuidanceSuggestion } from '../types/guidance.types';

export function GuidanceSuggestionCard({ suggestion, onPress }: { suggestion: GuidanceSuggestion; onPress: () => void }) {
  return (
    <MotionPressable accessibilityRole="button" accessibilityLabel={suggestion.title} onPress={onPress} className="mr-3 w-64 rounded-[22px] border border-border bg-surface p-5 active:bg-surface-raised">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-secondary/15"><Text className="text-xl text-secondary">{suggestion.icon}</Text></View>
      <Text className="mt-4 font-headline text-lg font-bold text-ink">{suggestion.title}</Text>
      <Text className="mt-2 font-body text-sm leading-5 text-muted">{suggestion.description}</Text>
    </MotionPressable>
  );
}
