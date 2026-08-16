import { useState } from 'react';
import {
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { themeColors, useThemeStore } from '@/store/theme.store';
interface Props extends TextInputProps {
  label: string;
  error?: string;
  dark?: boolean;
}
export function PasswordInput({ label, error, dark = false, ...props }: Props) {
  const [visible, setVisible] = useState(false);
  const mode = useThemeStore((state) => state.mode);
  return (
    <View className="gap-2">
      <Text
        className="font-label text-sm font-semibold text-ink"
      >
        {label}
      </Text>
      <View
        className={`min-h-14 flex-row items-center rounded-2xl border border-border bg-surface-raised ${error ? 'border-danger' : ''}`}
      >
        <TextInput
          secureTextEntry={!visible}
          placeholderTextColor={themeColors[mode].muted}
          className="flex-1 px-4 font-body text-base text-ink"
          {...props}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          onPress={() => setVisible((v) => !v)}
          className="p-4"
        >
          <Text
            className="font-label font-semibold text-primary"
          >
            {visible ? 'Hide' : 'Show'}
          </Text>
        </Pressable>
      </View>
      {error ? <Text className="text-sm text-danger">{error}</Text> : null}
    </View>
  );
}
