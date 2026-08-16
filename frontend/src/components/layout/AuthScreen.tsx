import type { PropsWithChildren } from 'react';
import { ThemedStatusBar } from '@/components/common/ThemedStatusBar';
import { Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '@/components/navigation/BackButton';

interface Props extends PropsWithChildren {
  eyebrow: string;
  title: string;
  subtitle: string;
  onBackPress?: () => void;
}
export function AuthScreen({ eyebrow, title, subtitle, onBackPress, children }: Props) {
  return (
    <SafeAreaView className="flex-1 overflow-hidden bg-canvas">
      <ThemedStatusBar />
      <View className="absolute -right-28 top-24 h-64 w-64 rounded-full bg-primary opacity-10" />
      <KeyboardAwareScrollView
        bottomOffset={32}
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingBottom: 128,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View className="flex-row items-center justify-between py-4">
          <BackButton onPress={onBackPress} />
          <Text className="text-sm font-semibold text-muted">Soulmeet</Text>
          <View className="h-11 w-11" />
        </View>
        <View className="mt-8">
          <Text className="font-label text-xs font-bold tracking-[3px] text-secondary">
            {eyebrow}
          </Text>
          <Text className="mt-4 font-headline text-[36px] font-bold leading-[41px] tracking-[-1px] text-ink">
            {title}
          </Text>
          <Text className="mb-8 mt-3 font-body text-base leading-6 text-muted">
            {subtitle}
          </Text>
          {children}
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
