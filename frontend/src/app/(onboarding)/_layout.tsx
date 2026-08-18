import { Stack } from 'expo-router';
import { MOTION } from '@/lib/motion';
import { useThemePalette } from '@/store/theme.store';
export default function OnboardingLayout() {
  const { colors } = useThemePalette();
  return (
    <Stack
      initialRouteName="index"
      screenOptions={{ headerShown: false, gestureEnabled: false, animation: 'slide_from_right', animationDuration: MOTION.panel, contentStyle: { backgroundColor: colors.canvas } }}
    >
      <Stack.Screen name="companion" />
      <Stack.Screen name="tone" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="coach" />
      <Stack.Screen name="personality" />
      <Stack.Screen name="getting-ready" />
    </Stack>
  );
}
