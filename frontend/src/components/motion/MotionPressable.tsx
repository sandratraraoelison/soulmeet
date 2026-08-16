import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { MOTION } from '@/lib/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
type Props = PressableProps & { className?: string; pressedScale?: number; style?: StyleProp<ViewStyle> };

export function MotionPressable({ onPressIn, onPressOut, disabled, pressedScale = MOTION.pressScale, style, ...props }: Props) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(event) => {
        if (!disabled && !reducedMotion) scale.value = withTiming(pressedScale, { duration: MOTION.instant });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withTiming(1, { duration: MOTION.fast });
        onPressOut?.(event);
      }}
      style={[animatedStyle, style]}
    />
  );
}
