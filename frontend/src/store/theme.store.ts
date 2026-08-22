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
  { id: 'soft', label: 'Soft', description: 'A quieter, intimate presentation.', swatches: ['#E9694F', '#7C5CFF', '#111832'] },
  { id: 'balanced', label: 'Balanced', description: 'Action and atmosphere in balance.', swatches: ['#E9694F', '#7C5CFF', '#0A0E1A'] },
  { id: 'bold', label: 'Bold', description: 'A stronger, more contrasted presentation.', swatches: ['#E9694F', '#4A3A8C', '#1A2340'] },
];

const soulmeetPalette = {
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

export const themePalettes = {
  soft: {
    dark: soulmeetPalette,
    light: soulmeetPalette,
  },
  balanced: {
    dark: soulmeetPalette,
    light: soulmeetPalette,
  },
  bold: {
    dark: soulmeetPalette,
    light: soulmeetPalette,
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
