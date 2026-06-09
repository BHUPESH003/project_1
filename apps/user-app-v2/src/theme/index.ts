import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, type ColorTokens } from './colors';
import { spacing, radius } from './spacing';
import { fontSize, fontWeight, lineHeight, typographyVariants, type TypographyVariant } from './typography';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppTheme {
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  colors: ColorTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  lineHeight: typeof lineHeight;
}

const THEME_KEY = '@app/theme_mode';

const ThemeContext = createContext<{
  theme: AppTheme;
  setMode: (mode: ThemeMode) => void;
} | null>(null);

function buildTheme(mode: ThemeMode, systemScheme: 'light' | 'dark' | null): AppTheme {
  const resolved: 'light' | 'dark' =
    mode === 'system' ? (systemScheme ?? 'light') : mode;
  return {
    mode,
    resolvedMode: resolved,
    colors: resolved === 'dark' ? darkColors : lightColors,
    spacing,
    radius,
    fontSize,
    fontWeight,
    lineHeight,
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  // Restore persisted preference
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored);
      }
    });
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(THEME_KEY, m);
  }, []);

  const resolvedScheme = systemScheme === 'dark' ? 'dark' : 'light';
  const theme = buildTheme(mode, resolvedScheme);

  return React.createElement(
    ThemeContext.Provider,
    { value: { theme, setMode } },
    children,
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function useColors() {
  return useTheme().theme.colors;
}

export function useSpacing() {
  return useTheme().theme.spacing;
}

export { spacing, radius, fontSize, fontWeight, lineHeight, typographyVariants };
export type { ColorTokens, TypographyVariant };
