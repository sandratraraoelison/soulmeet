import { ActivityIndicator, Text, View } from 'react-native';
import { ThemedStatusBar } from '@/components/common/ThemedStatusBar';
import Animated from 'react-native-reanimated';
import { motionFadeIn } from '@/lib/motion';

export function LoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center overflow-hidden bg-canvas px-8">
      <ThemedStatusBar />
      <View className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-primary opacity-10" />
      <View className="absolute -right-32 bottom-20 h-80 w-80 rounded-full bg-tertiary opacity-10" />
      <Animated.View entering={motionFadeIn} className="w-full max-w-sm items-center rounded-[26px] border border-border bg-surface px-8 py-10">
        <Text className="text-xs font-bold tracking-[6px] text-muted">
          SOULMEET
        </Text>
        <ActivityIndicator className="mt-7" color="#6366F1" size="small" />
        <Text className="mt-4 text-sm font-medium text-muted">
          Finding your place...
        </Text>
      </Animated.View>
    </View>
  );
}
