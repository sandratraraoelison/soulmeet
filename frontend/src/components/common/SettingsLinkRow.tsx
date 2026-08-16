import { Pressable, Text, View, type PressableProps } from 'react-native';

interface Props extends PressableProps {
  label: string;
  description?: string;
  value?: string;
  showChevron?: boolean;
}

export function SettingsLinkRow({ label, description, value, showChevron = true, ...props }: Props) {
  return (
    <Pressable accessibilityRole={showChevron ? 'button' : 'text'} className="min-h-16 flex-row items-center border-b border-border py-3 last:border-b-0 active:opacity-70" disabled={!showChevron} {...props}>
      <View className="flex-1 pr-4">
        <Text className="font-label font-semibold text-ink">{label}</Text>
        {description ? <Text className="mt-1 text-xs leading-5 text-muted">{description}</Text> : null}
      </View>
      {value ? <Text className="text-sm text-muted">{value}</Text> : null}
      {showChevron ? <Text className="ml-3 text-xl text-primary">›</Text> : null}
    </Pressable>
  );
}
