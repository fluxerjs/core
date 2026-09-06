/**
 * Hide Discord-only leftovers, internals, and wire converters from generated SDK docs.
 */

/** Symbols that exist in discord.js but not Fluxer. Never index or render them. */
export const DISCORD_GHOST_NAMES = new Set([
  'Interaction',
  'BaseInteraction',
  'ChatInputCommandInteraction',
  'ButtonInteraction',
  'StringSelectMenuInteraction',
  'UserSelectMenuInteraction',
  'RoleSelectMenuInteraction',
  'MentionableSelectMenuInteraction',
  'ChannelSelectMenuInteraction',
  'MessageComponentInteraction',
  'ModalSubmitInteraction',
  'AutocompleteInteraction',
  'CommandInteraction',
  'ApplicationCommand',
  'SlashCommandBuilder',
  'ContextMenuCommandBuilder',
  'StageChannel',
  'ThreadChannel',
  'NewsChannel',
  'ForumChannel',
  'MediaChannel',
  'AnnouncementChannel',
  'TextBasedChannel',
  'ThreadMember',
  'GuildScheduledEvent',
  'AutoModerationRule',
  'DirectoryChannel',
]);

const WIRE_CONVERTER = /^(toApi|fromApi|toAPI|fromAPI|toJSON|_patch|patchFrom)/;

export function isGhostSymbol(name: string): boolean {
  return DISCORD_GHOST_NAMES.has(name);
}

export function isWireConverterName(name: string): boolean {
  return WIRE_CONVERTER.test(name);
}

export function hasJSDocTag(comment: string, title: string): boolean {
  if (!comment) return false;
  const re = new RegExp(`@${title}\\b`, 'i');
  return re.test(comment);
}

/** Members starting with `_` / `#`, wire converters, or tagged `@internal` / `@hidden`. */
export function isHiddenMember(name: string, comment = ''): boolean {
  if (!name || name.startsWith('_') || name.startsWith('#')) return true;
  if (isWireConverterName(name)) return true;
  if (hasJSDocTag(comment, 'internal') || hasJSDocTag(comment, 'hidden')) return true;
  return false;
}

export function isHiddenSymbol(name: string, comment = ''): boolean {
  if (isGhostSymbol(name)) return true;
  if (hasJSDocTag(comment, 'internal') || hasJSDocTag(comment, 'hidden')) return true;
  return false;
}
