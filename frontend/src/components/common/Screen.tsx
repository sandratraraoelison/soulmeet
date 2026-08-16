import type { PropsWithChildren } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotionView } from '@/components/motion/MotionView';
import { themeColors, useThemeStore } from '@/store/theme.store';
export function Screen({ children }: PropsWithChildren) {
  const mode = useThemeStore((state) => state.mode);
  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-canvas">
      <KeyboardAwareScrollView
        bottomOffset={32}
        style={{ flex: 1, backgroundColor: themeColors[mode].canvas }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 20,
          paddingBottom: 32,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <MotionView className="flex-1">{children}</MotionView>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
