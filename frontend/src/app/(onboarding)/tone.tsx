import { router } from 'expo-router';
import { ThemedStatusBar } from '@/components/common/ThemedStatusBar';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/common/Button';
import { BackButton } from '@/components/navigation/BackButton';
import { CoachFacePicker } from '@/features/coach/components/CoachFacePicker';
import { useOnboardingStore } from '@/store/onboarding.store';

export default function CoachFaceScreen() {
  const selected = useOnboardingStore((state) => state.coachAppearance);
  const setAppearance = useOnboardingStore((state) => state.setCoachAppearance);
  const setGender = useOnboardingStore((state) => state.setCoachGender);
  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <ThemedStatusBar />
      <ScrollView contentContainerClassName="px-5 pb-8" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center border-b border-white/5 py-3"><BackButton /><Text className="text-sm text-muted">Soulmeet</Text></View>
        <View className="mt-7 flex-row justify-between"><Text className="text-xs font-bold tracking-wider text-[#AFA9E8]">STEP 1 OF 3</Text><Text className="text-xs text-muted">Coach setup</Text></View>
        <View className="mt-4 h-[3px] rounded-full bg-surface-raised"><View className="h-[3px] w-1/3 rounded-full bg-[#F7C94B]" /></View>
        <Text className="mt-8 text-center text-[30px] font-bold leading-9 text-ink">Choose your coach{`\n`}<Text className="text-[#F7C94B]">appearance</Text></Text>
        <Text className="mx-3 mb-7 mt-3 text-center text-base leading-6 text-muted">Choose the presence that makes you feel most comfortable. You can change it later.</Text>
        <CoachFacePicker value={selected} onChange={(face, gender) => { setAppearance(face); setGender(gender); }} />
        <View className="mt-7"><Button label="Continue" variant="light" onPress={() => router.push('/(onboarding)/coach')} /></View>
      </ScrollView>
    </SafeAreaView>
  );
}
