import { Easing, FadeIn, FadeInDown, FadeInUp, FadeOut, ReduceMotion } from 'react-native-reanimated';

export const MOTION = {
  instant: 120,
  fast: 180,
  panel: 240,
  screen: 300,
  pressScale: 0.975,
} as const;

const ease = Easing.bezier(0.2, 0, 0, 1);
export const motionEntering = FadeInDown.duration(MOTION.screen).easing(ease).withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] }).reduceMotion(ReduceMotion.System);
export const motionFadeIn = FadeIn.duration(MOTION.fast).easing(ease).reduceMotion(ReduceMotion.System);
export const motionFadeOut = FadeOut.duration(MOTION.instant).easing(ease).reduceMotion(ReduceMotion.System);
export const motionPanelEntering = FadeInUp.duration(MOTION.panel).easing(ease).withInitialValues({ opacity: 0, transform: [{ translateY: 16 }] }).reduceMotion(ReduceMotion.System);
