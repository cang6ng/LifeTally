import { useEffect } from 'react';
import { useSettingsStore } from '../stores';

export function useTheme() {
  const { theme, glassStrength } = useSettingsStore();

  useEffect(() => {
    const root = document.documentElement;

    // Apply theme
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark-theme');
    } else {
      root.classList.remove('dark-theme');
    }

    // Apply glass strength
    root.style.setProperty('--glass-blur', `${glassStrength}px`);
    root.style.setProperty('--glass-opacity', `${glassStrength / 100}`);
  }, [theme, glassStrength]);
}
