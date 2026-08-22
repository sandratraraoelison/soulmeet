import { useEffect, useRef } from 'react';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { Screen } from '@/components/common/Screen';
import { BackButton } from '@/components/navigation/BackButton';
import { mockMatches } from '@/data/mock-matches';

export default function ConnectionScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const match = mockMatches.find((item) => item.slug === name);
  const breathe = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      breathe.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [breathe, reducedMotion]);

  if (!match) {
    return (
      <Screen>
        <Text className="mt-10 font-headline text-2xl font-bold text-ink">
          Connection not found
        </Text>
        <View className="mt-6"><BackButton /></View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="pb-8">
        <View className="flex-row items-center py-3">
          <BackButton accessibilityLabel="Back to Soul" />
          <Text className="flex-1 pr-14 text-center font-headline text-3xl font-bold text-secondary">
            Soulmeet
          </Text>
        </View>

        <Animated.View
          className="mt-5 overflow-hidden rounded-t-[28px] border border-border bg-surface"
          style={{
            transform: [
              {
                translateY: breathe.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -3],
                }),
              },
              {
                scale: breathe.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.006],
                }),
              },
            ],
          }}
        >
          <View className="h-[360px] justify-end overflow-hidden bg-[#191820] p-6">
            <Animated.View
              className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-secondary"
              style={{
                opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.14] }),
                transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.12] }) }],
              }}
            />
            <Animated.View
              className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-primary"
              style={{
                opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.13, 0.04] }),
                transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1.1, 0.92] }) }],
              }}
            />
            <Animated.View
              className="absolute left-1/2 top-1/2 h-28 w-28 items-center justify-center rounded-full border border-secondary/30"
              style={{
                marginLeft: -56,
                marginTop: -56,
                opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
                transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.06] }) }],
              }}
            >
              <Text className="text-4xl tracking-[4px] text-secondary opacity-50">⠿</Text>
            </Animated.View>
            <View className="flex-row items-end justify-between">
              <View>
                <Text className="font-headline text-3xl font-bold text-ink">
                  {match.name}, {match.age}
                </Text>
                <Text className="mt-1 font-label text-xs font-bold uppercase tracking-wider text-muted">
                  {match.job}
                </Text>
              </View>
              <View className="rounded-full border border-secondary/30 bg-yellow-950/60 px-4 py-2">
                <Text className="font-label text-sm font-bold text-secondary">
                  {match.match} Match
                </Text>
              </View>
            </View>
          </View>

          <View className="border-t border-border p-6">
            <Text className="font-label text-xs font-bold uppercase tracking-wider text-primary">
              ✦  AI Coach Insights
            </Text>
            <Text className="mt-5 font-body text-xl italic leading-8 text-ink">
              “{match.insight}”
            </Text>

            <View className="mt-8 h-px bg-border" />
            <View className="mt-6 flex-row">
              <View className="flex-1 pr-4">
                <Text className="font-label text-[11px] font-bold uppercase tracking-wider text-muted">
                  Compatibility type
                </Text>
                <Text className="mt-2 font-headline text-2xl font-bold text-ink">
                  {match.compatibility}
                </Text>
              </View>
              <View className="items-end">
                <Text className="font-label text-[11px] font-bold uppercase tracking-wider text-muted">
                  Confidence
                </Text>
                <Text className="mt-2 font-headline text-2xl font-bold text-secondary">
                  {match.score}
                </Text>
              </View>
            </View>

            <View className="mt-7 flex-row items-center rounded-2xl border border-border bg-surface-raised p-4">
              <View className="mr-4 h-2 w-2 rounded-full bg-secondary" />
              <Text className="flex-1 font-body text-sm leading-5 text-ink">
                {match.name} is waiting to hear from you
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Chat with ${match.name}`}
              onPress={() => router.push(`/(app)/chat/${match.slug}` as Href)}
              className="mt-4 min-h-14 items-center justify-center rounded-2xl bg-primary px-5 active:opacity-80"
            >
              <Text className="font-label text-base font-bold text-[#25262E]">
                Chat with {match.name}  →
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Screen>
  );
}
