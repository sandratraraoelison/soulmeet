import { Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { motionFadeIn, motionFadeOut } from '@/lib/motion';
export function ErrorMessage({ message }: { message?: string | null }) {
  return message ? (
    <Animated.View entering={motionFadeIn} exiting={motionFadeOut}>
    <Text
      accessibilityRole="alert"
      className="rounded-xl border border-danger/30 bg-red-950/30 p-3 font-body text-sm text-danger"
    >
      {message}
    </Text>
    </Animated.View>
  ) : null;
}
