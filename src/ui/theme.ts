import { useSyncExternalStore } from 'react';

export type ThemeMode = 'light' | 'dark';

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
} as const;

const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
} as const;

const lightColors = {
  primary: '#2563EB',
  primaryDark: '#1E40AF',
  background: '#FFFFFF',
  surface: '#F9FAFB',
  text: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  error: '#DC2626',
  success: '#16A34A',
} as const;

const darkColors = {
  primary: '#818CF8',
  primaryDark: '#4F46E5',
  background: '#0F172A',
  surface: '#111827',
  text: '#F9FAFB',
  textMuted: '#CBD5E1',
  border: '#334155',
  error: '#F87171',
  success: '#4ADE80',
} as const;

export const theme = {
  colors: lightColors,
  spacing,
  radius,
  fontSize,
} as const;

export type Theme = typeof theme;

let themeMode: ThemeMode = 'light';
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function setThemeMode(mode: ThemeMode) {
  if (themeMode === mode) return;
  themeMode = mode;
  emit();
}

export function getThemeMode() {
  return themeMode;
}

export function useThemeMode() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => themeMode,
    () => themeMode,
  );
}

export function useThemeColors() {
  const mode = useThemeMode();
  return mode === 'dark' ? darkColors : lightColors;
}

export const themeVariants = {
  light: lightColors,
  dark: darkColors,
} as const;
