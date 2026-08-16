import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { useMemo } from 'react';
import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light';
const KEY = 'soulmeet.theme';
const webStorage = typeof globalThis !== 'undefined' && 'localStorage' in globalThis ? globalThis.localStorage : null;
const read = () => Platform.OS === 'web' ? Promise.resolve(webStorage?.getItem(KEY) ?? null) : SecureStore.getItemAsync(KEY);
const write = (value: string) => Platform.OS === 'web' ? Promise.resolve(webStorage?.setItem(KEY, value)) : SecureStore.setItemAsync(KEY, value);

interface ThemeState { mode: ThemeMode; hydrated: boolean; hydrate: () => Promise<void>; setMode: (mode: ThemeMode) => Promise<void> }
export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'dark', hydrated: false,
  hydrate: async () => { const stored = await read(); set({ mode: stored === 'light' ? 'light' : 'dark', hydrated: true }); },
  setMode: async (mode) => { set({ mode }); await write(mode); },
}));

export const themeColors = {
  dark: { canvas: '#0F1117', surface: '#1D1E24', raised: '#25262E', ink: '#F1F1F7', muted: '#9494A3', border: '#343640' },
  light: { canvas: '#F7F7FB', surface: '#FFFFFF', raised: '#EFF0F6', ink: '#1C1D25', muted: '#656777', border: '#D7D9E4' },
} as const;

export const themeVariables = {
  dark: { '--color-canvas': '15 17 23', '--color-surface': '29 30 36', '--color-surface-raised': '37 38 46', '--color-ink': '241 241 247', '--color-muted': '148 148 163', '--color-border': '52 54 64' },
  light: { '--color-canvas': '247 247 251', '--color-surface': '255 255 255', '--color-surface-raised': '239 240 246', '--color-ink': '28 29 37', '--color-muted': '101 103 119', '--color-border': '215 217 228' },
} as const;

/** Memoized palette for the active theme. */
export function useThemePalette() {
  const mode = useThemeStore((state) => state.mode);
  return useMemo(
    () => ({ mode, colors: themeColors[mode], vars: themeVariables[mode], themeColors }),
    [mode],
  );
}
