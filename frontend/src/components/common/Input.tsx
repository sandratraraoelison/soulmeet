import { forwardRef } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { themeColors, useThemeStore } from '@/store/theme.store';
interface Props extends TextInputProps {
  label: string;
  error?: string;
  dark?: boolean;
}
export const Input = forwardRef<TextInput, Props>(
  ({ label, error, dark = false, ...props }, ref) => {
    const mode = useThemeStore((state) => state.mode);
    return (
    <View className="gap-2">
      <Text
        className="font-label text-sm font-semibold text-ink"
      >
        {label}
      </Text>
      <TextInput
        ref={ref}
        placeholderTextColor={themeColors[mode].muted}
        className={`min-h-14 rounded-2xl border border-border bg-surface-raised px-4 font-body text-base text-ink ${error ? 'border-danger' : ''}`}
        {...props}
      />
      {error ? <Text className="text-sm text-danger">{error}</Text> : null}
    </View>
    );
  },
);
Input.displayName = 'Input';
