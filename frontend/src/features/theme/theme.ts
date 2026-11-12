import { createContext } from 'react';

export type Theme = 'light' | 'dark';

export interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

export const THEME_STORAGE_KEY = 'codepath-academy:theme';

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light';

  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/** Applies the saved palette before React mounts to avoid a light-theme flash. */
export function initializeTheme() {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = readStoredTheme();
  }
}
