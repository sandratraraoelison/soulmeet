import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { profileApi } from '@/api/profile.api';
import { MotionPressable } from '@/components/motion/MotionPressable';

export function AccountButton() {
  const profile = useQuery({ queryKey: ['profile'], queryFn: profileApi.get });
  const initial = profile.data?.firstName?.slice(0, 1).toUpperCase() ?? '•';
  return (
    <MotionPressable accessibilityRole="button" accessibilityLabel="Open your profile" onPress={() => router.push('/(app)/profile')} className="h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-primary/15">
      <Text className="font-headline text-base font-bold text-primary">{initial}</Text>
      <View className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-canvas bg-secondary" />
    </MotionPressable>
  );
}
