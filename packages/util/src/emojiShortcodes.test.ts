import { describe, it, expect } from 'vitest';
import { getUnicodeFromShortcode, UNICODE_EMOJI_SHORTCODES } from './emojiShortcodes.js';

describe('getUnicodeFromShortcode', () => {
  it('resolves :heart: to unicode', () => {
    const r = getUnicodeFromShortcode('heart');
    expect(r).toBeDefined();
    expect(typeof r).toBe('string');
    expect(r!.length).toBeGreaterThan(0);
  });

  it('is case-insensitive', () => {
    const a = getUnicodeFromShortcode('heart');
    const b = getUnicodeFromShortcode('HEART');
    const c = getUnicodeFromShortcode('Heart');
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('trims whitespace', () => {
    const r = getUnicodeFromShortcode('  heart  ');
    expect(r).toBe(UNICODE_EMOJI_SHORTCODES['heart']);
  });

  it('returns undefined for empty or invalid', () => {
    expect(getUnicodeFromShortcode('')).toBeUndefined();
    expect(getUnicodeFromShortcode('   ')).toBeUndefined();
    expect(getUnicodeFromShortcode('nonexistent_emoji_xyz')).toBeUndefined();
  });

  it('returns undefined for null/undefined input', () => {
    expect(getUnicodeFromShortcode(null as unknown as string)).toBeUndefined();
    expect(getUnicodeFromShortcode(undefined as unknown as string)).toBeUndefined();
  });

  it('resolves common shortcodes', () => {
    expect(getUnicodeFromShortcode('thumbsup')).toBeDefined();
    expect(getUnicodeFromShortcode('smile')).toBeDefined();
    expect(getUnicodeFromShortcode('fire')).toBeDefined();
  });
});
