import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import { getTheme } from './theme';
import { useThemeStore } from './theme.store';
import type { AppTheme, ResolvedThemeMode, ThemeColors } from './types';

const ThemeContext = createContext<AppTheme | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const colorScheme = useColorScheme();
  const mode = useThemeStore((s) => s.themeMode);
  const deviceScheme = colorScheme ?? Appearance.getColorScheme() ?? 'light';
  const resolvedMode: ResolvedThemeMode =
    mode === 'system' ? (deviceScheme === 'dark' ? 'dark' : 'light') : mode;

  const theme = useMemo(() => getTheme(resolvedMode, mode), [resolvedMode, mode]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }
  return theme;
}

export function useThemeColors(): ThemeColors {
  return useAppTheme().colors;
}

export function useResolvedThemeMode(): ResolvedThemeMode {
  return useAppTheme().resolvedMode;
}

export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const colors = useThemeColors();
  return useMemo(() => factory(colors), [factory, colors]);
}
