import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';

export function useTheme() {
  const theme    = useAppStore(s => s.theme);
  const setTheme = useAppStore(s => s.setTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pepite_theme', theme);
    // Keep the PWA status bar / browser chrome in sync (iOS, Android)
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'light' ? '#f2f2f7' : '#000000');
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return { theme, toggleTheme };
}
