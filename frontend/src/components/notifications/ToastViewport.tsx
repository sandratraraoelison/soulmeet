import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotionPressable } from '@/components/motion/MotionPressable';
import { motionPanelEntering, motionFadeOut } from '@/lib/motion';
import { useToastStore } from '@/store/toast.store';
import { useThemePalette } from '@/store/theme.store';

function ToastItem({ toast }: { toast: ReturnType<typeof useToastStore.getState>['toasts'][number] }) {
  const dismiss = useToastStore((state) => state.dismiss);
  const { colors } = useThemePalette();
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(toast.message);
    if (toast.kind === 'error') return;
    const timer = setTimeout(() => dismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast, dismiss]);
  return (
    <Animated.View entering={motionPanelEntering} exiting={motionFadeOut} style={[styles.toast, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: toast.kind === 'error' ? colors.danger : '#45c98a' }]}>
      <MaterialCommunityIcons name={toast.kind === 'error' ? 'alert-circle-outline' : 'check-circle-outline'} size={22} color={toast.kind === 'error' ? colors.danger : '#45c98a'} style={{ marginRight: 10 }} />
      <Text accessibilityRole="alert" style={[styles.message, { color: colors.ink }]}>{toast.message}</Text>
      <MotionPressable accessibilityRole="button" accessibilityLabel="Close notification" onPress={() => dismiss(toast.id)} style={styles.close}>
        <MaterialCommunityIcons name="close" size={22} color={colors.muted} />
      </MotionPressable>
    </Animated.View>
  );
}

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.viewport, { top: insets.top + 12 }]}>
      {toasts.map((toast) => <ToastItem key={toast.id} toast={toast} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: { position: 'absolute', left: 16, right: 16, zIndex: 1000, alignItems: 'center', gap: 8 },
  toast: { width: '100%', maxWidth: 420, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderLeftWidth: 4, borderRadius: 8, paddingLeft: 16, paddingVertical: 8, elevation: 8, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  message: { flex: 1, fontSize: 14, lineHeight: 21 },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
