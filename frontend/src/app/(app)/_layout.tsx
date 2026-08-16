import { Stack, usePathname } from 'expo-router';
import { View } from 'react-native';
import { BottomNav } from '@/components/navigation/BottomNav';
import { MOTION } from '@/lib/motion';
import { useThemePalette } from '@/store/theme.store';
export default function AppLayout() {
  const pathname = usePathname();
  const isChat = pathname.startsWith('/chat/') || pathname.startsWith('/conversation/') || pathname.startsWith('/guidance/');
  const { colors } = useThemePalette();

  return (
    <View className="flex-1 bg-canvas">
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: MOTION.fast,
          contentStyle: { backgroundColor: colors.canvas },
        }}
      />
      {isChat ? null : <BottomNav />}
    </View>
  );
}
