import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedStatusBar } from '@/components/common/ThemedStatusBar';
import { MotionPressable } from '@/components/motion/MotionPressable';
import { motionEntering, motionFadeIn, motionPanelEntering } from '@/lib/motion';
import { useThemeStore } from '@/store/theme.store';

const lightLogo = require('../../../assets/branding/soulmeet-logo-light.png');
const darkLogo = require('../../../assets/branding/soulmeet-logo-dark.png');

function ArrowIcon() {
  return (
    <View className="h-5 w-5 items-center justify-center">
      <View className="absolute left-0.5 h-0.5 w-4 rounded-full bg-white" />
      <View className="absolute right-0.5 h-2.5 w-2.5 rotate-45 border-r-2 border-t-2 border-white" />
    </View>
  );
}

export default function WelcomeScreen() {
  const mode = useThemeStore((state) => state.mode);

  return (
    <SafeAreaView className="flex-1 overflow-hidden bg-canvas">
      <ThemedStatusBar />

      <View className="absolute -left-24 top-12 h-64 w-64 rounded-full bg-primary opacity-[0.08]" />
      <View className="absolute -right-28 bottom-8 h-72 w-72 rounded-full bg-tertiary opacity-[0.07]" />
      <View className="absolute left-10 top-52 h-2 w-2 rounded-full bg-secondary opacity-70" />
      <View className="absolute right-12 top-28 h-1.5 w-1.5 rounded-full bg-primary opacity-70" />

      <View className="flex-1 px-6 pb-5 pt-4">
        <Animated.View entering={motionFadeIn} className="flex-row items-center justify-center">
          <Image
            accessibilityLabel="Soulmeet logo"
            source={mode === 'light' ? lightLogo : darkLogo}
            contentFit="contain"
            className="-my-3 -ml-3 -mr-1 h-14 w-14"
          />
          <Text className="font-headline text-lg font-bold tracking-[-0.5px] text-ink">
            Soulmeet
          </Text>
        </Animated.View>

        <View className="flex-1 justify-center py-6">
          <Animated.View entering={motionEntering} className="overflow-hidden rounded-[32px] border border-primary/20 bg-surface-raised px-7 py-9 shadow-2xl shadow-black">
            <View className="absolute -right-12 -top-12 h-32 w-32 rounded-full border border-primary/20 bg-primary/10" />
            <View className="absolute -bottom-16 -left-10 h-32 w-32 rounded-full border border-secondary/10 bg-secondary/5" />

            <View className="self-center rounded-full border border-secondary/25 bg-secondary/10 px-4 py-2">
              <Text className="font-label text-[9px] font-bold tracking-[2.5px] text-secondary">
                YOUR PRIVATE SPACE
              </Text>
            </View>

            <Text className="mt-7 text-center font-headline text-[34px] font-bold leading-[39px] tracking-[-1.4px] text-ink">
              What if someone{`\n`}actually{' '}
              <Text className="text-secondary">understood</Text>
              {`\n`}how you love?
            </Text>

            <View className="mx-auto mt-7 h-px w-12 bg-secondary/50" />

            <Text className="mt-6 text-center font-body text-[15px] font-medium leading-6 text-muted">
              A wise, luminous companion for your emotional journey.
            </Text>
          </Animated.View>
        </View>

        <View>
          <Animated.View entering={motionPanelEntering}>
            <MotionPressable
              accessibilityRole="button"
              accessibilityLabel="Get started"
              onPress={() => router.push('/(public)/login')}
              className="min-h-16 flex-row items-center justify-center rounded-full bg-[#E7E7EF] px-5 shadow-lg shadow-black active:opacity-90"
            >
              <Text className="font-label text-lg font-bold text-[#25262E]">
                Get Started
              </Text>
              <View className="absolute right-3 h-10 w-10 items-center justify-center rounded-full bg-[#25262E]">
                <ArrowIcon />
              </View>
            </MotionPressable>
          </Animated.View>

          <Animated.View entering={motionFadeIn} className="mt-5 flex-row items-center justify-center">
            <View className="mr-2 items-center">
              <View className="h-2 w-2 rounded-t-full border-x border-t border-muted" />
              <View className="h-2.5 w-3 rounded-[2px] bg-muted" />
            </View>
            <Text className="font-label text-[9px] font-bold tracking-[2.5px] text-muted">
              END-TO-END ENCRYPTED
            </Text>
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
}
