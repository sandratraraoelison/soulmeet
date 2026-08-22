import { ActivityIndicator, Text, View } from 'react-native';
import { ThemedStatusBar } from '@/components/common/ThemedStatusBar';
import Animated from 'react-native-reanimated';
import { motionFadeIn } from '@/lib/motion';
import { useThemePalette } from '@/store/theme.store';

export function LoadingScreen() {
  const { colors } = useThemePalette();
  return (
    <View className="flex-1 items-center justify-center overflow-hidden bg-canvas px-8">
      <ThemedStatusBar />
      <View className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-secondary opacity-15" />
      <View className="absolute -right-32 bottom-20 h-80 w-80 rounded-full bg-tertiary opacity-20" />
      <Animated.View entering={motionFadeIn} className="w-full max-w-sm items-center rounded-[26px] border border-secondary/20 bg-surface px-8 py-10 shadow-2xl shadow-secondary">
        <Text className="text-xs font-bold tracking-[6px] text-muted">
          SOULMEET
        </Text>
        <ActivityIndicator className="mt-7" color={colors.secondary} size="small" />
        <Text className="mt-4 text-sm font-medium text-muted">
          Finding your place...
        </Text>
      </Animated.View>
    </View>
  );
}
