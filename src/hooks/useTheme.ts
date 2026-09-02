import { useEffect, useState, useCallback } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';
import { AppTheme } from '../types/settings';

const THEME_STORAGE_KEY = 'thunder_edge_theme';

function getStoredTheme(): AppTheme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch {
    // ignore
  }
  return 'dark';
}

function resolveTheme(theme: AppTheme): 'dark' | 'light' {
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
  const body = document.body;
  const resolved = resolveTheme(theme);

  root.classList.remove('dark', 'light');
  root.classList.add(resolved);
  root.setAttribute('data-theme', resolved);
  root.style.colorScheme = resolved;

  if (body) {
    body.classList.remove('dark', 'light');
    body.classList.add(resolved);
    body.setAttribute('data-theme', resolved);
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }

  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: resolved } }));
}

export function useTheme() {
  const { settings, updateSettings } = useSettingsStore();
  const [localTheme, setLocalTheme] = useState<AppTheme>(() => {
    return settings.theme || getStoredTheme();
  });

  const activeTheme = settings.theme || localTheme;

  useEffect(() => {
    applyThemeToDOM(activeTheme);

    if (activeTheme === 'system' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyThemeToDOM('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [activeTheme]);

  const setTheme = useCallback(
    async (newTheme: AppTheme) => {
      setLocalTheme(newTheme);
      applyThemeToDOM(newTheme);
      try {
        await updateSettings({ theme: newTheme });
      } catch {
        // Fallback already applied to DOM and localStorage
      }
    },
    [updateSettings]
  );

  const toggleTheme = useCallback(async () => {
    const currentResolved = resolveTheme(activeTheme);
    const nextTheme: AppTheme = currentResolved === 'dark' ? 'light' : 'dark';
    await setTheme(nextTheme);
  }, [activeTheme, setTheme]);

  const isDark = resolveTheme(activeTheme) === 'dark';

  return {
    theme: activeTheme,
    isDark,
    toggleTheme,
    setTheme,
  };
}
