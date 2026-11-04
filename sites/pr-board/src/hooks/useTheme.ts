import { useEffect } from 'react';
import type { Density, Theme } from '../settings.ts';

// The theme and density from Settings, on the root element where the stylesheets read them (SET-7, SET-15).
export function useTheme(theme: Theme, density: Density) {
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme; else root.dataset.theme = theme;
    root.dataset.density = density;
  }, [theme, density]);
}
