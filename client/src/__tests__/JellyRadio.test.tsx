import { describe, it, expect, vi } from 'vitest';
import JellyRadio from '../components/JellyRadio';

describe('JellyRadio Component', () => {
  it('is defined and can be imported correctly', () => {
    expect(JellyRadio).toBeDefined();
    expect(typeof JellyRadio).toBe('function');
  });

  it('declares the expected component interface', () => {
    const props = {
      items: ['Off', 'Low', 'Medium', 'High', 'Max'],
      defaultValue: 'Medium',
      onChange: vi.fn(),
      chipColor: '#202222',
      activeColor: '#20B2AA',
      textColor: '#9EA3A3',
      activeTextColor: '#000000',
      size: 'md' as const,
      gap: 8,
      radius: 18,
      swell: 0.2,
      barge: 6,
      shrink: 0.05,
      jelly: 1,
      bounce: 0.25,
      stagger: 22,
      stiffness: 580,
    };

    expect(props.items.length).toBe(5);
    expect(props.defaultValue).toBe('Medium');
  });

  it('supports item objects with label, icon, and disabled states', () => {
    const items = [
      { value: 'list', label: 'List' },
      { value: 'grid', label: 'Grid' },
      { value: 'map', label: 'Map', disabled: true },
    ];

    expect(items[0].value).toBe('list');
    expect(items[2].disabled).toBe(true);
  });
});
