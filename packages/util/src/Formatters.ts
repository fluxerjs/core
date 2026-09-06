/**
 * Format a number as a `#rrggbb` hex color string.
 */
export function formatColor(color: number): string {
  if (!Number.isInteger(color) || color < 0 || color > 0xffffff) {
    throw new RangeError('Color must be an integer between 0 and 16777215');
  }
  return `#${color.toString(16).padStart(6, '0')}`;
}

/**
 * Escape markdown formatting characters in a string.
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/([\\*_`~|])/g, '\\$1');
}

export type TimestampStyle = 't' | 'T' | 'd' | 'D' | 'f' | 'F' | 'R';

/**
 * Format a Unix timestamp (milliseconds) as a Fluxer timestamp mention.
 * @param timestampMs - Unix timestamp in milliseconds
 * @param style - Optional display style (`t`, `T`, `d`, `D`, `f`, `F`, `R`)
 */
export function formatTimestamp(timestampMs: number, style?: TimestampStyle): string {
  const seconds = Math.floor(timestampMs / 1000);
  return style ? `<t:${seconds}:${style}>` : `<t:${seconds}>`;
}

/**
 * Truncate a string to a maximum length with an optional suffix.
 * If `maxLength` is smaller than the suffix, returns the suffix truncated to `maxLength`.
 */
export function truncate(str: string, maxLength: number, suffix = '...'): string {
  if (maxLength < 0) throw new RangeError('maxLength must be non-negative');
  if (str.length <= maxLength) return str;
  if (maxLength <= suffix.length) return suffix;
  return str.slice(0, maxLength - suffix.length) + suffix;
}
