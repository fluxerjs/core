/**
 * Guide sidebar: discord.js-style groups.
 * getting-started: install, first bot, prefix parse, errors, caching, task index
 * popular: messages, channels, events, collectors
 * guilds: roles, permissions, kick/ban, member search, discovery application
 * additional: sharding, voice, media (advanced topics marked in guides)
 * upgrading: 3.0 upgrade, 2.0 rewrite (demoted; not Getting Started)
 * other: from-discordjs
 */

const CATEGORY_LABELS: Record<string, string> = {
  'getting-started': 'Getting Started',
  popular: 'Popular Topics',
  guilds: 'Guilds & Moderation',
  additional: 'Additional',
  upgrading: 'Upgrading',
  other: 'Other',
};

const CATEGORY_BLURBS: Record<string, string> = {
  'getting-started': 'Install, login, prefix commands, errors, cache, and a task index.',
  popular: 'Send, reply, embeds, channels, events, and collectors.',
  guilds: 'Roles, permissions, moderation, members, and server settings.',
  additional: 'Sharding, voice, webhooks, media, presence, and self-hosting.',
  upgrading: 'Breaking changes from 2.x and the 1.x rewrite.',
  other: 'Coming from discord.js.',
};

/** Category order for guides index (Getting Started first). */
export const CATEGORY_ORDER: string[] = [
  'getting-started',
  'popular',
  'guilds',
  'additional',
  'upgrading',
  'other',
];

/** Common tasks shown on the guides index. Full list: /guides/where-do-i/. */
export const GUIDE_TASKS: { task: string; slug: string }[] = [
  { task: 'Send, reply, or forward', slug: 'sending-without-reply' },
  { task: 'Send in a voice channel', slug: 'sending-without-reply' },
  { task: 'Embeds and files', slug: 'embeds' },
  { task: 'Fetch or search history', slug: 'message-history' },
  { task: 'Reactions and collectors', slug: 'collectors' },
  { task: 'Channels, overwrites, links', slug: 'channels' },
  { task: 'Roles and permissions', slug: 'roles' },
  { task: 'Kick, ban, or timeout', slug: 'moderation' },
  { task: 'Emojis and stickers', slug: 'emojis' },
  { task: 'Webhooks', slug: 'webhooks' },
  { task: 'Invites and vanity URLs', slug: 'invites' },
  { task: 'Direct messages', slug: 'direct-messages' },
  { task: 'Content warnings', slug: 'content-warnings' },
  { task: 'Apply for server discovery', slug: 'server-discovery' },
  { task: 'Shard a large bot', slug: 'sharding' },
  { task: 'Play voice audio', slug: 'voice' },
];

export function getCategoryLabel(cat?: string): string {
  return (cat && CATEGORY_LABELS[cat]) ?? 'Guides';
}

export function getCategoryBlurb(cat?: string): string | undefined {
  return cat ? CATEGORY_BLURBS[cat] : undefined;
}
