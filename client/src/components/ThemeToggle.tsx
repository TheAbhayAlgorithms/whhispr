import { useThemeStore } from '../store/useThemeStore';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export function ThemeToggle({ showLabel = true, className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useThemeStore();
  const isLight = theme === 'light';

  return (
    <button
      onClick={toggleTheme}
      type="button"
      id="daylight-theme-toggle-btn"
      title={isLight ? 'Daylight theme is ON (Click to switch to Dark mode)' : 'Dark theme is ON (Click to switch to Daylight mode)'}
      className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all duration-200 text-xs font-semibold shadow-xs select-none ${
        isLight
          ? 'bg-amber-50 hover:bg-amber-100/90 border-amber-200/90 text-amber-900 hover:border-amber-300'
          : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 hover:border-slate-600'
      } ${className}`}
      aria-label="Toggle daylight / dark mode"
    >
      {isLight ? (
        <>
          <Sun className="w-4 h-4 text-amber-500 fill-amber-400 transition-transform group-hover:rotate-45" />
          {showLabel && <span>Daylight ON</span>}
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-indigo-400 fill-indigo-400/20 transition-transform group-hover:-rotate-12" />
          {showLabel && <span>Dark Mode</span>}
        </>
      )}
    </button>
  );
}

