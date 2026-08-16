import { router, usePathname, type Href } from 'expo-router';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotionPressable } from '@/components/motion/MotionPressable';
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

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      className="border-t border-primary bg-surface"
    >
      <View className="mx-2 mb-2 mt-3 flex-row rounded-[22px] bg-surface px-1 py-2">
        {items.map((item) => {
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
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              onPress={() => router.replace(item.href as Href)}
              className="min-h-16 flex-1 items-center justify-center rounded-2xl active:bg-white/5"
            >
              <View className="h-8 w-8 items-center justify-center">
                <Text
                  style={{ fontSize: item.iconSize, lineHeight: 32 }}
                  className={active ? 'text-secondary' : 'text-muted'}
                >
                  {item.icon}
                </Text>
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
