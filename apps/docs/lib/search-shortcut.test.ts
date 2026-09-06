import { describe, expect, it } from 'vitest';
import { detectSearchShortcut } from './search-shortcut';

describe('detectSearchShortcut', () => {
  it('uses Command on Apple platforms', () => {
    expect(detectSearchShortcut('MacIntel')).toBe('⌘K');
    expect(detectSearchShortcut('iPhone')).toBe('⌘K');
  });

  it('uses Ctrl elsewhere', () => {
    expect(detectSearchShortcut('Win32')).toBe('Ctrl K');
    expect(detectSearchShortcut('Linux x86_64')).toBe('Ctrl K');
  });
});
