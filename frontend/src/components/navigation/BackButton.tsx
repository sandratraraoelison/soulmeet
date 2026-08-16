import { router, type Href } from 'expo-router';
import { Text } from 'react-native';
import { MotionPressable } from '@/components/motion/MotionPressable';

interface BackButtonProps {
  fallbackHref?: Href;
  accessibilityLabel?: string;
  onPress?: () => void;
}

export function BackButton({ fallbackHref, accessibilityLabel = 'Go back', onPress }: BackButtonProps) {
  const goBack = () => {
    if (onPress) return onPress();
    if (router.canGoBack()) return router.back();
    if (fallbackHref) router.replace(fallbackHref);
  };

  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={10}
      onPress={goBack}
      className="h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/15 shadow-sm active:bg-primary/25"
    >
      <Text
        className="w-11 text-center font-label text-[34px] font-semibold text-primary"
        style={{ includeFontPadding: false, lineHeight: 34, textAlignVertical: 'center', transform: [{ translateY: -1 }] }}
      >
        {String.fromCharCode(8249)}
      </Text>
    </MotionPressable>
  );
}
