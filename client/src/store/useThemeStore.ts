import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  // Default to light theme as requested
  theme: 'light',

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
      let savedTheme: Theme = 'light';
      try {
        const stored = localStorage.getItem('beacon_theme') as Theme | null;
        if (stored === 'dark' || stored === 'light') {
          savedTheme = stored;
        } else {
          // Default is light
          savedTheme = 'light';
        }
      } catch {
        savedTheme = 'light';
      }

      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      set({ theme: savedTheme });
    }
  },
}));
