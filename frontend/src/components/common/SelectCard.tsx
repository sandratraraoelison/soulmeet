import { Text } from 'react-native';
import { MotionPressable } from '@/components/motion/MotionPressable';
export function SelectCard({
  title,
  description,
  selected,
  onPress,
}: {
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <MotionPressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      className={`rounded-2xl border p-4 ${selected ? 'border-primary bg-primary/10' : 'border-border bg-surface'}`}
    >
      <Text className="font-bold text-ink">{title}</Text>
      {description ? (
        <Text className="mt-1 text-sm text-muted">{description}</Text>
      ) : null}
    </MotionPressable>
  );
}
