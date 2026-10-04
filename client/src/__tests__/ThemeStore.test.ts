import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from '../store/useThemeStore';

describe('useThemeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: 'light' });
  });

  it('defaults to light (daylight) theme', () => {
    expect(useThemeStore.getState().theme).toBe('light');
  });

  it('toggles from light to dark, then back to light', () => {
    const { toggleTheme } = useThemeStore.getState();

    toggleTheme();
    expect(useThemeStore.getState().theme).toBe('dark');

    toggleTheme();
    expect(useThemeStore.getState().theme).toBe('light');
  });

  it('sets theme explicitly', () => {
    const { setTheme } = useThemeStore.getState();

    setTheme('dark');
    expect(useThemeStore.getState().theme).toBe('dark');

    setTheme('light');
    expect(useThemeStore.getState().theme).toBe('light');
  });
});
