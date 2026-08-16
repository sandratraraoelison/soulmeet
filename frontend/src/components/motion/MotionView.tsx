import type { PropsWithChildren } from 'react';
import Animated from 'react-native-reanimated';
import { motionEntering } from '@/lib/motion';

export function MotionView({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <Animated.View entering={motionEntering} className={className}>{children}</Animated.View>;
}
