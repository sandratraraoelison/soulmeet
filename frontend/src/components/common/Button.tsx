import {
  ActivityIndicator,
  Text,
  type PressableProps,
} from 'react-native';
import { MotionPressable } from '@/components/motion/MotionPressable';
import { useThemePalette } from '@/store/theme.store';
interface Props extends PressableProps {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'light';
}
export function Button({
  label,
  loading = false,
  disabled,
  variant = 'primary',
  ...props
}: Props) {
  const { colors: palette } = useThemePalette();
  const colors =
    variant === 'primary'
      ? 'bg-primary'
      : variant === 'light'
        ? 'bg-primary'
        : variant === 'secondary'
          ? 'bg-surface-raised border border-border'
          : 'bg-transparent';
  const text =
    variant === 'primary'
      ? 'text-white'
      : variant === 'light'
        ? 'text-white'
        : variant === 'secondary'
          ? 'text-ink'
          : 'text-primary';
  return (
    <MotionPressable
      accessibilityRole="button"
      disabled={disabled || loading}
      className={`min-h-14 items-center justify-center rounded-2xl px-5 ${colors} ${disabled || loading ? 'opacity-50' : 'active:opacity-80'}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'primary'
              ? '#fff'
              : variant === 'light'
                ? '#FFFFFF'
                : palette.primary
          }
        />
      ) : (
        <Text className={`font-label text-base font-bold ${text}`}>{label}</Text>
      )}
    </MotionPressable>
  );
}
