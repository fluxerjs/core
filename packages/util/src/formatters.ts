/**
 * Format a number as a hex color string.
 */
export function formatColor(color: number): string {
  const hex = color.toString(16).padStart(6, '0');
  return `#${hex}`;
}

/**
 * Escape markdown formatting characters in a string.
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/([\\*_`~|])/g, '\\$1');
}

/**
 * Format a Unix timestamp for Fluxer/Discord style timestamps.
 * @param timestamp - Unix timestamp in seconds
 * @param style - t, T, d, D, f, F, R, etc.
 */
export function formatTimestamp(
  timestamp: number,
  style?: 't' | 'T' | 'd' | 'D' | 'f' | 'F' | 'R',
): string {
  const suffix = style ? `:${style}` : '';
  return `<t:${Math.floor(timestamp / 1000)}${suffix}>`;
}

/**
 * Truncate a string to a maximum length with an optional suffix.
 */
export function truncate(str: string, maxLength: number, suffix = '...'): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}
