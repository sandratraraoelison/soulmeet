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
  { id: 'soft', label: 'Soft', description: 'Warm, gentle and expressive.', swatches: ['#9B4F7F', '#D9A7B8', '#8B7AD8'] },
  { id: 'balanced', label: 'Balanced', description: 'Welcoming, calm and universal.', swatches: ['#6D5BD0', '#C9869E', '#4F9C96'] },
  { id: 'bold', label: 'Bold', description: 'Structured, vivid and confident.', swatches: ['#176B77', '#E09F3E', '#D05A75'] },
];

export const themePalettes = {
  soft: {
    dark: { primary: '#A8558A', primaryDark: '#873E6D', secondary: '#D9A7B8', tertiary: '#8B7AD8', canvas: '#151116', surface: '#251E26', raised: '#302631', ink: '#F8F1F5', muted: '#B6A5AF', border: '#493B45', danger: '#F49AA8' },
    light: { primary: '#9B4F7F', primaryDark: '#7B3B64', secondary: '#C9869E', tertiary: '#7462C4', canvas: '#FFF8FB', surface: '#FFFFFF', raised: '#F8EAF0', ink: '#2A2027', muted: '#786570', border: '#E7CDD8', danger: '#C94F66' },
  },
  balanced: {
    dark: { primary: '#6D5BD0', primaryDark: '#5948B8', secondary: '#C9869E', tertiary: '#4F9C96', canvas: '#121117', surface: '#211E26', raised: '#2B2731', ink: '#F5F1F6', muted: '#AAA1AD', border: '#403A47', danger: '#F39AAA' },
    light: { primary: '#6251C5', primaryDark: '#4E3FAD', secondary: '#B76F8A', tertiary: '#357D78', canvas: '#FBF8FA', surface: '#FFFFFF', raised: '#F2EDF2', ink: '#241F27', muted: '#706875', border: '#DED6DF', danger: '#C94F66' },
  },
  bold: {
    dark: { primary: '#176B77', primaryDark: '#105761', secondary: '#E09F3E', tertiary: '#D05A75', canvas: '#0D1215', surface: '#182126', raised: '#223036', ink: '#F2F7F8', muted: '#99ADB3', border: '#30444B', danger: '#F08181' },
    light: { primary: '#176B77', primaryDark: '#105761', secondary: '#B96F16', tertiary: '#B33F5C', canvas: '#F5F9F9', surface: '#FFFFFF', raised: '#E8F0F1', ink: '#152326', muted: '#5F7378', border: '#CADADC', danger: '#B93838' },
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
