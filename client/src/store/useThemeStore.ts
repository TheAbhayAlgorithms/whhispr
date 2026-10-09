import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  // Default to shady dark theme matching reference
  theme: 'dark',

  setTheme: (theme: Theme) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('beacon_theme', theme);
      } catch {
        // Ignore storage errors
      }

      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    set({ theme });
  },

  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    get().setTheme(next);
  },

  initTheme: () => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('beacon_theme');
        if (!stored || stored === 'light') {
          localStorage.setItem('beacon_theme', 'dark');
        }
      } catch {
        // ignore
      }
      document.documentElement.classList.add('dark');
      set({ theme: 'dark' });
    }
  },
}));
