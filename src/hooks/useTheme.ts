import { useCallback, useEffect, useRef, useState } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';
import { AppTheme } from '../types/settings';

const THEME_STORAGE_KEY = 'thunder_edge_theme';

type ResolvedTheme = 'dark' | 'light';

function readStoredTheme(): AppTheme | null {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {
    // localStorage may be unavailable (private mode, restricted context, SSR).
  }
  return null;
}

function resolveTheme(theme: AppTheme): ResolvedTheme {
  if (theme === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  }
  return theme;
}

function applyThemeToDOM(theme: AppTheme) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const resolved = resolveTheme(theme);

  // Theme is a visual-only update. Do not trigger a React/data refresh here.
  root.classList.toggle('dark', resolved === 'dark');
  root.classList.toggle('light', resolved === 'light');
  root.setAttribute('data-theme', resolved);
  root.style.colorScheme = resolved;

  if (document.body) {
    document.body.classList.toggle('dark', resolved === 'dark');
    document.body.classList.toggle('light', resolved === 'light');
    document.body.setAttribute('data-theme', resolved);
  }
}

function persistThemeLocally(theme: AppTheme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}

export function useTheme() {
  const { settings, updateSettings } = useSettingsStore();
  const storedTheme = readStoredTheme();
  const [localTheme, setLocalTheme] = useState<AppTheme>(() => storedTheme || settings.theme || 'dark');
  const userChangedThemeRef = useRef(Boolean(storedTheme));

  // Settings can load asynchronously. Sync the initial persisted DB preference once,
  // but never let a background settings load overwrite a user's active toggle.
  useEffect(() => {
    if (!userChangedThemeRef.current && settings.theme) {
      setLocalTheme(settings.theme);
      applyThemeToDOM(settings.theme);
    }
  }, [settings.theme]);

  const activeTheme = localTheme;

  useEffect(() => {
    applyThemeToDOM(activeTheme);

    if (activeTheme === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyThemeToDOM('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [activeTheme]);

  const setTheme = useCallback(
    (newTheme: AppTheme) => {
      // Update the UI immediately; persistence happens in the background.
      userChangedThemeRef.current = true;
      setLocalTheme(newTheme);
      applyThemeToDOM(newTheme);
      persistThemeLocally(newTheme);

      // Do not await this. A theme click must never block the UI thread or navigation.
      void updateSettings({ theme: newTheme }).catch(() => {
        // Local theme state/localStorage remain the responsive fallback.
      });
    },
    [updateSettings]
  );

  const toggleTheme = useCallback(() => {
    const currentResolved = resolveTheme(activeTheme);
    setTheme(currentResolved === 'dark' ? 'light' : 'dark');
  }, [activeTheme, setTheme]);

  const isDark = resolveTheme(activeTheme) === 'dark';

  return {
    theme: activeTheme,
    isDark,
    toggleTheme,
    setTheme,
  };
}
