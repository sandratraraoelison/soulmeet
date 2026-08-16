import { Stack } from 'expo-router';
import { MOTION } from '@/lib/motion';
import { themeColors, useThemeStore } from '@/store/theme.store';
export default function PublicLayout() {
  const mode = useThemeStore((state) => state.mode);
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        animationDuration: MOTION.fast,
        contentStyle: { backgroundColor: themeColors[mode].canvas },
      }}
    />
  );
}
