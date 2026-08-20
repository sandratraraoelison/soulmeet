import { router, usePathname, type Href } from 'expo-router';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotionPressable } from '@/components/motion/MotionPressable';
import { useConversations } from '@/features/chat/hooks/use-chat';
import { useGrowth } from '@/features/growth/hooks/use-growth';
import { useSoulprint } from '@/features/insights/hooks/use-soulprint';
import { motionFadeIn } from '@/lib/motion';

const items = [
  {
    label: 'Guidance',
    icon: '✦',
    iconSize: 25,
    href: '/(app)/home',
    route: '/home',
  },
  {
    label: 'Insights',
    icon: '✧',
    iconSize: 28,
    href: '/(app)/insights',
    route: '/insights',
  },
  {
    label: 'Growth',
    icon: '↗',
    iconSize: 27,
    href: '/(app)/growth',
    route: '/growth',
  },
  {
    label: 'Soul',
    icon: '♥',
    iconSize: 24,
    href: '/(app)/soul',
    route: '/soul',
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const insights = useSoulprint();
  const growth = useGrowth();
  const conversations = useConversations();
  const notificationCounts: Partial<Record<(typeof items)[number]['label'], number>> = {
    Insights: insights.data?.pendingConfirmationCount ?? 0,
    Growth: growth.data?.suggestedGoals.length ?? 0,
    Soul: conversations.data?.reduce(
      (total, conversation) => total + conversation.unreadCount,
      0,
    ) ?? 0,
  };

  return (
    <SafeAreaView
      edges={['left', 'right']}
      className="border-t border-primary bg-surface"
      style={{ paddingBottom: Math.max(insets.bottom - 12, 4) }}
    >
      <View className="mx-2 mt-2 flex-row rounded-[22px] bg-surface py-1">
        {items.map((item) => {
          const notificationCount = notificationCounts[item.label] ?? 0;
          const active =
            pathname === item.route ||
            (item.label === 'Insights' && pathname.startsWith('/insights/')) ||
            (item.label === 'Soul' &&
              (pathname === '/profile' ||
                pathname === '/settings' ||
                pathname.startsWith('/connection/')));

          return (
            <MotionPressable
              key={item.label}
              accessibilityRole="tab"
              accessibilityLabel={`${item.label}${notificationCount ? `, ${notificationCount} new notification${notificationCount === 1 ? '' : 's'}` : ''}`}
              accessibilityState={{ selected: active }}
              onPress={() => router.replace(item.href as Href)}
              className="min-h-14 flex-1 items-center justify-center rounded-2xl active:bg-white/5"
            >
              <View className="h-8 w-8 items-center justify-center">
                <Text
                  style={{ fontSize: item.iconSize, lineHeight: 32 }}
                  className={active ? 'text-secondary' : 'text-muted'}
                >
                  {item.icon}
                </Text>
                {notificationCount > 0 ? (
                  <View className="absolute -right-3 -top-2 min-w-5 items-center justify-center rounded-full border-2 border-surface bg-danger px-1">
                    <Text className="font-label text-[10px] font-bold leading-4 text-white">
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                className={`mt-1 font-label text-xs font-bold tracking-wide ${active ? 'text-secondary' : 'text-muted'}`}
              >
                {item.label}
              </Text>
              <View className="mt-1 h-1 w-1">{active ? <Animated.View entering={motionFadeIn} className="h-1 w-1 rounded-full bg-secondary" /> : null}</View>
            </MotionPressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
