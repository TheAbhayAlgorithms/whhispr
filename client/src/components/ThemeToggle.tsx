import { useThemeStore } from '../store/useThemeStore';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  showLabel?: boolean;
  hideLabelBelow?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ThemeToggle({
  showLabel = true,
  hideLabelBelow,
  className = '',
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useThemeStore();
  const isLight = theme === 'light';

  const labelClasses = hideLabelBelow === 'lg'
    ? 'hidden lg:inline whitespace-nowrap'
    : hideLabelBelow === 'md'
    ? 'hidden md:inline whitespace-nowrap'
    : hideLabelBelow === 'sm'
    ? 'hidden sm:inline whitespace-nowrap'
    : 'whitespace-nowrap';

  return (
    <button
      onClick={toggleTheme}
      type="button"
      id="daylight-theme-toggle-btn"
      title={isLight ? 'Daylight theme is ON (Click to switch to Dark mode)' : 'Dark theme is ON (Click to switch to Daylight mode)'}
      className={`group flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border transition-all duration-200 text-xs font-semibold shadow-xs select-none whitespace-nowrap shrink-0 touch-target-44 sm:min-h-0 ${
        isLight
          ? 'bg-amber-50 hover:bg-amber-100/90 border-amber-200/90 text-amber-900 hover:border-amber-300'
          : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 hover:border-slate-600'
      } ${className}`}
      aria-label={isLight ? 'Switch to Dark Mode' : 'Switch to Daylight Mode'}
    >
      {isLight ? (
        <>
          <Sun className="w-4 h-4 text-amber-500 fill-amber-400 transition-transform group-hover:rotate-45 shrink-0" />
          {showLabel && <span className={labelClasses}>Daylight ON</span>}
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-indigo-400 fill-indigo-400/20 transition-transform group-hover:-rotate-12 shrink-0" />
          {showLabel && <span className={labelClasses}>Dark Mode</span>}
        </>
      )}
    </button>
  );
}
