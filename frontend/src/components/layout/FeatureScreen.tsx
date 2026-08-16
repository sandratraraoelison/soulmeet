import { Text, View } from 'react-native';
import { Screen } from '@/components/common/Screen';

export function FeatureScreen({
  eyebrow,
  title,
  description,
  accent = 'primary',
}: {
  eyebrow: string;
  title: string;
  description: string;
  accent?: 'primary' | 'secondary' | 'tertiary';
}) {
  const accentClass =
    accent === 'secondary'
      ? 'bg-secondary'
      : accent === 'tertiary'
        ? 'bg-tertiary'
        : 'bg-primary';

  return (
    <Screen>
      <View className="flex-1 py-6">
        <Text className="font-label text-xs font-bold tracking-[3px] text-secondary">
          {eyebrow}
        </Text>
        <Text className="mt-4 font-headline text-4xl font-bold text-ink">
          {title}
        </Text>
        <View className="mt-8 rounded-[24px] border border-border bg-surface p-6">
          <View className={`h-12 w-12 rounded-2xl ${accentClass}`} />
          <Text className="mt-6 font-headline text-xl font-bold text-ink">
            A space made for you
          </Text>
          <Text className="mt-3 font-body text-base leading-6 text-muted">
            {description}
          </Text>
          <View className="mt-6 self-start rounded-full border border-border bg-surface-raised px-4 py-2">
            <Text className="font-label text-xs font-bold uppercase tracking-wider text-muted">
              Coming soon
            </Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}
