import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { useMemo } from 'react';
import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light';
export type VisualStyle = 'soft' | 'balanced' | 'bold';
const MODE_KEY = 'soulmeet.theme';
const STYLE_KEY = 'soulmeet.visual-style';
const webStorage = typeof globalThis !== 'undefined' && 'localStorage' in globalThis ? globalThis.localStorage : null;
const read = (key: string) => Platform.OS === 'web' ? Promise.resolve(webStorage?.getItem(key) ?? null) : SecureStore.getItemAsync(key);
const write = (key: string, value: string) => Platform.OS === 'web' ? Promise.resolve(webStorage?.setItem(key, value)) : SecureStore.setItemAsync(key, value);

export const visualStyleOptions: { id: VisualStyle; label: string; description: string; swatches: string[] }[] = [
  { id: 'soft', label: 'Soft', description: 'Softer coral and a lighter violet glow.', swatches: ['#F27A61', '#927BFF', '#121A35'] },
  { id: 'balanced', label: 'Balanced', description: 'Action and atmosphere in balance.', swatches: ['#E9694F', '#7C5CFF', '#0A0E1A'] },
  { id: 'bold', label: 'Bold', description: 'Deeper navy and stronger coral contrast.', swatches: ['#C9543C', '#6849E8', '#080B15'] },
];

const balancedDark = {
  primary: '#E9694F',
  primaryDark: '#C9543C',
  secondary: '#7C5CFF',
  tertiary: '#4A3A8C',
  canvas: '#0A0E1A',
  surface: '#111832',
  raised: '#1A2340',
  ink: '#F4F5F7',
  muted: '#9AA0AD',
  border: '#1A2340',
  danger: '#E5484D',
} as const;

const balancedLight = {
  primary: '#E9694F', primaryDark: '#C9543C', secondary: '#7C5CFF', tertiary: '#4A3A8C',
  canvas: '#F7F5FF', surface: '#FFFFFF', raised: '#EEEAFB', ink: '#161A2B', muted: '#62697A', border: '#DCD6F3', danger: '#E5484D',
} as const;

export const themePalettes = {
  soft: {
    dark: { ...balancedDark, primary: '#F27A61', primaryDark: '#E9694F', secondary: '#927BFF', tertiary: '#5A4A99', canvas: '#0C1120', surface: '#121A35', raised: '#1C2645' },
    light: { ...balancedLight, primary: '#F27A61', primaryDark: '#E9694F', secondary: '#927BFF', tertiary: '#5A4A99', canvas: '#FAF8FF', raised: '#F2EEFC' },
  },
  balanced: {
    dark: balancedDark,
    light: balancedLight,
  },
  bold: {
    dark: { ...balancedDark, primary: '#C9543C', primaryDark: '#A94230', secondary: '#6849E8', tertiary: '#4A3A8C', canvas: '#080B15', surface: '#0F152B', raised: '#182039' },
    light: { ...balancedLight, primary: '#C9543C', primaryDark: '#A94230', secondary: '#6849E8', tertiary: '#4A3A8C', canvas: '#F2F0FA', raised: '#E6E1F5', ink: '#101421' },
  },
} as const;

// Backward-compatible balanced palette for non-react call sites.
export const themeColors = {
  dark: themePalettes.balanced.dark,
  light: themePalettes.balanced.light,
} as const;

interface ThemeState {
  mode: ThemeMode;
  visualStyle: VisualStyle;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
  setVisualStyle: (style: VisualStyle) => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'dark',
  visualStyle: 'balanced',
  hydrated: false,
  hydrate: async () => {
    const [storedMode, storedStyle] = await Promise.all([read(MODE_KEY), read(STYLE_KEY)]);
    set({
      mode: storedMode === 'light' ? 'light' : 'dark',
      visualStyle: storedStyle === 'soft' || storedStyle === 'bold' ? storedStyle : 'balanced',
      hydrated: true,
    });
  },
  setMode: async (mode) => { set({ mode }); await write(MODE_KEY, mode); },
  setVisualStyle: async (visualStyle) => { set({ visualStyle }); await write(STYLE_KEY, visualStyle); },
}));

const rgb = (hex: string) => {
  const value = hex.replace('#', '');
  return `${Number.parseInt(value.slice(0, 2), 16)} ${Number.parseInt(value.slice(2, 4), 16)} ${Number.parseInt(value.slice(4, 6), 16)}`;
};

export function useThemePalette() {
  const mode = useThemeStore((state) => state.mode);
  const visualStyle = useThemeStore((state) => state.visualStyle);
  return useMemo(() => {
    const colors = themePalettes[visualStyle][mode];
    return {
      mode,
      visualStyle,
      colors,
      vars: {
        '--color-primary': rgb(colors.primary),
        '--color-primary-dark': rgb(colors.primaryDark),
        '--color-secondary': rgb(colors.secondary),
        '--color-tertiary': rgb(colors.tertiary),
        '--color-danger': rgb(colors.danger),
        '--color-canvas': rgb(colors.canvas),
        '--color-surface': rgb(colors.surface),
        '--color-surface-raised': rgb(colors.raised),
        '--color-ink': rgb(colors.ink),
        '--color-muted': rgb(colors.muted),
        '--color-border': rgb(colors.border),
      },
    };
  }, [mode, visualStyle]);
}
