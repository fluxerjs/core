/**
 * Resolve a color from various input types to a number (0-16777215).
 */
export function resolveColor(color: number | string | [number, number, number]): number {
  if (typeof color === 'number') {
    if (color < 0 || color > 0xffffff) throw new RangeError('Color must be between 0 and 16777215');
    return color;
  }
  if (Array.isArray(color)) {
    const [r, g, b] = color;
    return (r! << 16) | (g! << 8) | b!;
  }
  if (typeof color === 'string') {
    const hex = color.replace(/^#/, '');
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) throw new RangeError('Invalid hex color');
    return parseInt(hex, 16);
  }
  throw new TypeError('Color must be a number, hex string, or RGB array');
}

/**
 * Parse an emoji string (e.g. :name:123 or unicode) into id and name.
 */
export function parseEmoji(emoji: string): { id: string | null; name: string } | null {
  const custom = /^<a?:\w+:(\d+)>$/;
  const match = emoji.match(custom);
  if (match) {
    const name = emoji.slice(emoji.indexOf(':') + 1, emoji.lastIndexOf(':'));
    return { id: match[1]!, name };
  }
  if (emoji.length > 0) return { id: null, name: emoji };
  return null;
}

/**
 * Convert emoji to the format used in API (for reactions etc).
 * Custom: "name:id", Unicode: "unicode"
 */
export function formatEmoji(emoji: { id: string | null; name: string; animated?: boolean }): string {
  if (emoji.id) {
    const prefix = emoji.animated ? 'a' : '';
    return `${prefix}:${emoji.name}:${emoji.id}`;
  }
  return encodeURIComponent(emoji.name);
}
