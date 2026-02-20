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
 * Parse a user mention string or raw snowflake and extract the user ID.
 * Supports: <@123456789012345678>, <@!123456789012345678>, or raw 17–19 digit snowflake.
 * @param arg - String that may contain a user mention or raw user ID
 * @returns The user ID if valid, otherwise null
 * @example
 * parseUserMention('<@!123456789012345678>'); // '123456789012345678'
 * parseUserMention('<@123456789012345678>');  // '123456789012345678'
 * parseUserMention('123456789012345678');     // '123456789012345678'
 */
export function parseUserMention(arg: string): string | null {
  if (arg == null || typeof arg !== 'string') return null;
  const trimmed = arg.trim();
  if (trimmed.length === 0) return null;
  const mentionMatch = trimmed.match(/^<@!?(\d{17,19})>$/);
  if (mentionMatch) return mentionMatch[1];
  if (/^\d{17,19}$/.test(trimmed)) return trimmed;
  return null;
}

/**
 * Parse prefix command content into command name and args.
 * Returns null if content does not start with the prefix.
 * @param content - Raw message content
 * @param prefix - Command prefix (e.g. '!')
 * @returns { command, args } or null
 * @example
 * parsePrefixCommand('!ping', '!');      // { command: 'ping', args: [] }
 * parsePrefixCommand('!hello world', '!'); // { command: 'hello', args: ['world'] }
 */
export function parsePrefixCommand(
  content: string,
  prefix: string,
): { command: string; args: string[] } | null {
  if (content == null || typeof content !== 'string') return null;
  const trimmed = content.trim();
  if (!trimmed.startsWith(prefix)) return null;
  const rest = trimmed.slice(prefix.length).trim();
  if (rest.length === 0) return null;
  const parts = rest.split(/\s+/);
  const command = parts[0]?.toLowerCase() ?? '';
  const args = parts.slice(1);
  return { command, args };
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
