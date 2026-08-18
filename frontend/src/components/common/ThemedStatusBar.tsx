import { StatusBar } from 'expo-status-bar';
import { useThemePalette } from '@/store/theme.store';

export function ThemedStatusBar() {
  const { mode, colors } = useThemePalette();
  return <StatusBar style={mode === 'light' ? 'dark' : 'light'} backgroundColor={colors.canvas} />;
}
