import { StatusBar } from 'expo-status-bar';
import { themeColors, useThemeStore } from '@/store/theme.store';

export function ThemedStatusBar() {
  const mode = useThemeStore((state) => state.mode);
  return <StatusBar style={mode === 'light' ? 'dark' : 'light'} backgroundColor={themeColors[mode].canvas} />;
}
