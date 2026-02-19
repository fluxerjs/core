/**
 * Maps Unicode emoji shortcodes (:name:) to their Unicode characters.
 * Used to resolve shortcodes like :red_square: and :light_blue_heart: for message.react()
 * without requiring guild context. Custom emojis use guild lookup; known Unicode shortcodes
 * resolve here so they work in DMs and guild channels alike.
 *
 * Data is generated from emojilib (same source as node-emoji).
 * Run: pnpm exec tsx scripts/generate-emoji-shortcodes.ts
 */
import { UNICODE_EMOJI_SHORTCODES as SHORTCODES } from './emojiShortcodes.generated.js';

export const UNICODE_EMOJI_SHORTCODES = SHORTCODES;

/**
 * Get the Unicode character for a known shortcode name.
 * Case-insensitive. Returns undefined if the shortcode is not in the map.
 */
export function getUnicodeFromShortcode(name: string): string | undefined {
  if (!name || typeof name !== 'string') return undefined;
  const key = name.toLowerCase().trim();
  return UNICODE_EMOJI_SHORTCODES[key];
}
