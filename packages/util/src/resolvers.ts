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
 * Parse an emoji string into id and name.
 * Supports: <a?:name:id> (mention), :name: (colons), name:id (API format), unicode.
 */
export function parseEmoji(
  emoji: string,
): { id: string | null; name: string; animated?: boolean } | null {
  if (emoji == null || typeof emoji !== 'string') return null;
  const trimmed = emoji.trim();
  if (trimmed.length === 0) return null;
  // <a?:name:id> mention format
  const mention = /^<(a?):(\w+):(\d+)>$/;
  const mentionMatch = trimmed.match(mention);
  if (mentionMatch) {
    return {
      id: mentionMatch[3],
      name: mentionMatch[2],
      animated: mentionMatch[1] === 'a',
    };
  }
  // name:id API format (custom emoji)
  const nameId = /^(\w+):(\d{17,19})$/;
  const nameIdMatch = trimmed.match(nameId);
  if (nameIdMatch) {
    return { id: nameIdMatch[2], name: nameIdMatch[1] };
  }
  // :name: format (colons, no id - needs guild lookup)
  const colons = /^:(\w+):$/;
  const colonsMatch = trimmed.match(colons);
  if (colonsMatch) {
    return { id: null, name: colonsMatch[1] };
  }
  // Plain name (possibly unicode) - id null
  return { id: null, name: trimmed };
}

/**
 * Parse a role mention string (e.g. <@&123456>) and extract the role ID.
 * @param arg - String that may contain a role mention
 * @returns The role ID if valid mention, otherwise null
 */
export function parseRoleMention(arg: string): string | null {
  if (arg == null || typeof arg !== 'string') return null;
  const match = arg.trim().match(/^<@&(\d{17,19})>$/);
  return match?.[1] ?? null;
}

/**
 * Convert emoji to the format used in API (for reactions etc).
 * Custom: "name:id", Unicode: "unicode"
 */
export function formatEmoji(emoji: {
  id: string | null;
  name: string;
  animated?: boolean;
}): string {
  if (emoji.id) {
    const prefix = emoji.animated ? 'a' : '';
    return `${prefix}:${emoji.name}:${emoji.id}`;
  }
  return encodeURIComponent(emoji.name);
}
