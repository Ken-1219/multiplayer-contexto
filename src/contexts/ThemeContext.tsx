'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeType = 'emerald' | 'purple' | 'ocean' | 'charcoal';

interface ThemeColors {
  name: string;
  bgFrom: string;
  bgTo: string;
  bgPattern: string;
  primary: string;
  primaryHover: string;
  accent: string;
  accentGlow: string;
  cardBg: string;
  cardBorder: string;
  cardHoverBorder: string;
  inputBg: string;
  inputBorder: string;
  inputFocusBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  error: string;
  errorBg: string;
  gradientFrom: string;
  gradientTo: string;
}

export const themes: Record<ThemeType, ThemeColors> = {
  emerald: {
    name: 'Emerald',
    bgFrom: '#0a1a14',
    bgTo: '#0f1f17',
    bgPattern: 'rgba(16, 185, 129, 0.03)',
    primary: '#10b981',
    primaryHover: '#059669',
    accent: '#34d399',
    accentGlow: 'rgba(52, 211, 153, 0.4)',
    cardBg: 'rgba(16, 185, 129, 0.08)',
    cardBorder: 'rgba(16, 185, 129, 0.2)',
    cardHoverBorder: 'rgba(16, 185, 129, 0.4)',
    inputBg: 'rgba(16, 185, 129, 0.1)',
    inputBorder: 'rgba(16, 185, 129, 0.3)',
    inputFocusBorder: '#10b981',
    textPrimary: '#ffffff',
    textSecondary: '#d1fae5',
    textMuted: '#6ee7b7',
    success: '#10b981',
    successBg: 'rgba(16, 185, 129, 0.2)',
    warning: '#fbbf24',
    warningBg: 'rgba(251, 191, 36, 0.2)',
    error: '#ef4444',
    errorBg: 'rgba(239, 68, 68, 0.2)',
    gradientFrom: '#10b981',
    gradientTo: '#06b6d4',
  },
  purple: {
    name: 'Purple',
    bgFrom: '#0f0a1a',
    bgTo: '#1a1025',
    bgPattern: 'rgba(139, 92, 246, 0.03)',
    primary: '#8b5cf6',
    primaryHover: '#7c3aed',
    accent: '#c084fc',
    accentGlow: 'rgba(192, 132, 252, 0.4)',
    cardBg: 'rgba(139, 92, 246, 0.08)',
    cardBorder: 'rgba(139, 92, 246, 0.2)',
    cardHoverBorder: 'rgba(139, 92, 246, 0.4)',
    inputBg: 'rgba(139, 92, 246, 0.1)',
    inputBorder: 'rgba(139, 92, 246, 0.3)',
    inputFocusBorder: '#8b5cf6',
    textPrimary: '#ffffff',
    textSecondary: '#e9d5ff',
    textMuted: '#c4b5fd',
    success: '#a78bfa',
    successBg: 'rgba(167, 139, 250, 0.2)',
    warning: '#fbbf24',
    warningBg: 'rgba(251, 191, 36, 0.2)',
    error: '#f87171',
    errorBg: 'rgba(248, 113, 113, 0.2)',
    gradientFrom: '#8b5cf6',
    gradientTo: '#ec4899',
  },
  ocean: {
    name: 'Ocean',
    bgFrom: '#0a1628',
    bgTo: '#0f172a',
    bgPattern: 'rgba(6, 182, 212, 0.03)',
    primary: '#06b6d4',
    primaryHover: '#0891b2',
    accent: '#22d3ee',
    accentGlow: 'rgba(34, 211, 238, 0.4)',
    cardBg: 'rgba(6, 182, 212, 0.08)',
    cardBorder: 'rgba(6, 182, 212, 0.2)',
    cardHoverBorder: 'rgba(6, 182, 212, 0.4)',
    inputBg: 'rgba(6, 182, 212, 0.1)',
    inputBorder: 'rgba(6, 182, 212, 0.3)',
    inputFocusBorder: '#06b6d4',
    textPrimary: '#ffffff',
    textSecondary: '#cffafe',
    textMuted: '#67e8f9',
    success: '#06b6d4',
    successBg: 'rgba(6, 182, 212, 0.2)',
    warning: '#fbbf24',
    warningBg: 'rgba(251, 191, 36, 0.2)',
    error: '#f87171',
    errorBg: 'rgba(248, 113, 113, 0.2)',
    gradientFrom: '#06b6d4',
    gradientTo: '#3b82f6',
  },
  charcoal: {
    name: 'Charcoal',
    bgFrom: '#111111',
    bgTo: '#1a1a1a',
    bgPattern: 'rgba(161, 161, 170, 0.02)',
    primary: '#a1a1aa',
    primaryHover: '#71717a',
    accent: '#f4f4f5',
    accentGlow: 'rgba(244, 244, 245, 0.3)',
    cardBg: 'rgba(161, 161, 170, 0.06)',
    cardBorder: 'rgba(161, 161, 170, 0.15)',
    cardHoverBorder: 'rgba(161, 161, 170, 0.3)',
    inputBg: 'rgba(161, 161, 170, 0.08)',
    inputBorder: 'rgba(161, 161, 170, 0.2)',
    inputFocusBorder: '#a1a1aa',
    textPrimary: '#ffffff',
    textSecondary: '#e4e4e7',
    textMuted: '#a1a1aa',
    success: '#a1a1aa',
    successBg: 'rgba(161, 161, 170, 0.2)',
    warning: '#fbbf24',
    warningBg: 'rgba(251, 191, 36, 0.2)',
    error: '#f87171',
    errorBg: 'rgba(248, 113, 113, 0.2)',
    gradientFrom: '#71717a',
    gradientTo: '#a1a1aa',
  },
};

interface ThemeContextType {
  theme: ThemeType;
  colors: ThemeColors;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'contexto-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>('emerald');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeType | null;
    if (stored && themes[stored]) {
      setThemeState(stored);
    }
    setMounted(true);
  }, []);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  };

  const colors = themes[theme];

  // Prevent flash of wrong theme
  if (!mounted) {
    return (
      <div style={{ visibility: 'hidden' }}>
        {children}
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, colors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  // During static generation, return default theme instead of throwing
  if (context === undefined) {
    return {
      theme: 'emerald' as ThemeType,
      colors: themes.emerald,
      setTheme: () => {},
    };
  }
  return context;
}
