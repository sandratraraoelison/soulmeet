import { Stack } from 'expo-router';
import { MOTION } from '@/lib/motion';
import { useThemePalette } from '@/store/theme.store';
export default function PublicLayout() {
  const { colors } = useThemePalette();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        animationDuration: MOTION.fast,
        contentStyle: { backgroundColor: colors.canvas },
      }}
    />
  );
}
