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
      className={`group relative rounded-full flex items-center justify-center border transition-all duration-200 shadow-xs active:scale-95 cursor-pointer shrink-0 ${sizeClasses} ${
        isLight
          ? 'bg-[#F3F3F2] hover:bg-[#ECECEB] border-[#E5E5E3] text-[#20B2AA] hover:text-[#1CA099]'
          : 'bg-[#202222] hover:bg-[#262828] border-[#2D3030] text-[#20B2AA] hover:text-[#1CA099]'
      } ${className}`}
    >
      {isLight ? (
        <Sun className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-amber-500 fill-amber-500/20 transition-transform duration-300 group-hover:rotate-45 shrink-0" />
      ) : (
        <Moon className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#20B2AA] fill-[#20B2AA]/20 transition-transform duration-300 group-hover:-rotate-12 shrink-0" />
      )}
    </button>
  );
}

