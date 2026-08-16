import { Text, View } from 'react-native';
export function ProgressIndicator({
  step,
  total,
}: {
  step: number;
  total: number;
}) {
  return (
    <View className="mb-6 gap-2">
      <Text className="text-sm font-semibold text-primary">
        Step {step} of {total}
      </Text>
      <View className="h-1 overflow-hidden rounded-full bg-surface-raised">
        <View
          className="h-full bg-primary"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </View>
    </View>
  );
}
