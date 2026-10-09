import { useThemeStore } from '../store/useThemeStore';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  hideLabelBelow?: 'sm' | 'md' | 'lg';
}

export function ThemeToggle({
  className = '',
  size = 'md',
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useThemeStore();
  const isLight = theme === 'light';

  const sizeClasses =
    size === 'sm'
      ? 'w-8 h-8'
      : size === 'lg'
      ? 'w-10 h-10'
      : 'w-9 h-9 sm:w-10 sm:h-10';

  return (
    <button
      onClick={toggleTheme}
      type="button"
      id="daylight-theme-toggle-btn"
      title={isLight ? 'Daylight theme is ON (Click to switch to Dark mode)' : 'Dark theme is ON (Click to switch to Daylight mode)'}
      aria-label={isLight ? 'Switch to Dark Mode' : 'Switch to Daylight Mode'}
      className={`group relative rounded-full flex items-center justify-center border transition-all duration-300 shadow-xs active:scale-95 cursor-pointer shrink-0 ${sizeClasses} ${
        isLight
          ? 'bg-blue-50 hover:bg-blue-100 border-blue-200/90 text-blue-600 hover:border-blue-300 shadow-blue-500/10'
          : 'bg-[#16161c] hover:bg-[#1f1f28] border-[#262633] text-blue-400 hover:border-blue-500/40 shadow-blue-500/10'
      } ${className}`}
    >
      {isLight ? (
        <Sun className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-blue-600 fill-blue-500/30 transition-transform duration-300 group-hover:rotate-45 shrink-0" />
      ) : (
        <Moon className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-blue-400 fill-blue-400/30 transition-transform duration-300 group-hover:-rotate-12 shrink-0" />
      )}
    </button>
  );
}

