import type { DocClass, DocEnum, DocInterface, DocOutput } from './doc-schema';

/** Prefer these prefixes when picking a display path. */
const PREFERRED_PREFIXES = [
  'client.',
  'guild.',
  'message.',
  'channel.',
  'member.',
  'user.',
] as const;

/** Extra instance names beyond camelCasing the class. */
export const INSTANCE_ALIASES: Record<string, string[]> = {
  Client: ['client'],
  ClientUser: ['user'],
  Guild: ['guild'],
  GuildMember: ['member'],
  PartialGuildMember: ['member'],
  Message: ['message'],
  PartialMessage: ['message'],
  User: ['user'],
  Role: ['role'],
  Channel: ['channel'],
  GuildChannel: ['channel'],
  TextChannel: ['channel'],
  DMChannel: ['channel'],
  VoiceChannel: ['channel'],
  CategoryChannel: ['channel'],
  LinkChannel: ['channel'],
  Webhook: ['webhook'],
  WebSocketManager: ['ws'],
  GuildEmoji: ['emoji'],
  GuildSticker: ['sticker'],
  Invite: ['invite'],
  MessageReaction: ['reaction'],
};

/** discord.js leftovers that must never appear as search aliases. */
export const DISCORD_GHOST_NAMES = new Set([
  'Interaction',
  'BaseInteraction',
  'ChatInputCommandInteraction',
  'ButtonInteraction',
  'StringSelectMenuInteraction',
  'MessageComponentInteraction',
  'ModalSubmitInteraction',
  'AutocompleteInteraction',
  'CommandInteraction',
  'ApplicationCommand',
  'SlashCommandBuilder',
  'StageChannel',
  'ThreadChannel',
  'NewsChannel',
  'ForumChannel',
  'AnnouncementChannel',
  'TextBasedChannel',
  'ThreadMember',
]);

/** Extra search phrases for everyday bot verbs. */
export const METHOD_ACTION_KEYWORDS: Record<string, string> = {
  delete: 'delete channel remove channel channel.delete Channel#delete',
  send: 'send message post message channel.send Channel#send',
  reply: 'reply pong message.reply Message#reply',
  resolveChannel: 'resolve channel get channel message.resolveChannel Message#resolveChannel',
  resolveGuild: 'resolve guild get guild message.resolveGuild Message#resolveGuild',
  login: 'login connect client.login Client#login',
  fetch: 'fetch channel fetch guild client.channels.fetch',
  ping: 'latency heartbeat rtt gateway ping client.ws.ping WebSocketManager#ping',
  uptime: 'uptime ready duration client.uptime Client#uptime',
};

export function isGhostSymbol(name: string): boolean {
  return DISCORD_GHOST_NAMES.has(name);
}

const SKIP_TYPE_NAMES = new Set([
  'string',
  'number',
  'boolean',
  'void',
  'null',
  'undefined',
  'never',
  'any',
  'unknown',
  'object',
  'bigint',
  'symbol',
  'this',
  'Promise',
  'Array',
  'ReadonlyArray',
  'Set',
  'Map',
  'Record',
  'Partial',
  'Required',
  'Readonly',
  'Pick',
  'Omit',
  'NonNullable',
  'ReturnType',
  'Date',
  'Error',
  'Function',
  'Buffer',
]);

export interface AccessPathIndex {
  /** Class name -> instance paths (`client.user`, `guild`). */
  classPaths: Map<string, string[]>;
}

/** Outer type name: `ClientUser | null` -> `ClientUser`, `LimitedCollection<string, Role>` -> `LimitedCollection`. */
export function outerTypeName(type: string): string | undefined {
  const cleaned = type.replace(/^readonly\s+/, '').trim();
  const parts = cleaned
    .split('|')
    .map((p) => p.trim())
    .filter((p) => p !== 'null' && p !== 'undefined' && p !== 'void');
  const first = parts[0];
  if (!first) return undefined;
  const match = first.match(/^([A-Za-z_][A-Za-z0-9_]*)/);
  const name = match?.[1];
  if (!name || SKIP_TYPE_NAMES.has(name)) return undefined;
  return name;
}

/** Backtick paths from JSDoc, e.g. `client.user`. */
export function extractBacktickPaths(text?: string): string[] {
  if (!text) return [];
  const out: string[] = [];
  const re = /`([a-z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)+)`/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const path = match[1];
    if (path) out.push(path);
  }
  return unique(out);
}

/** Last segment looks like a method (`fetch`, `resolveChannel`), not an instance. */
export function looksLikeMethodPath(path: string): boolean {
  const last = path.split('.').pop() ?? '';
  return /^(fetch|resolve|create|send|delete|login|get|set|add|remove|edit|await|request|search|list|join|leave|play|connect|disconnect|kick|ban|timeout|sweep|bulk)/i.test(
    last,
  );
}

export function camelCaseName(name: string): string {
  if (!name) return name;
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function instanceNames(className: string): string[] {
  const aliases = INSTANCE_ALIASES[className];
  const camel = camelCaseName(className);
  return unique([...(aliases ?? []), camel]);
}

function unique(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

function subclassesOf(classes: DocClass[]): Map<string, string[]> {
  const children = new Map<string, string[]>();
  for (const c of classes) {
    const parent = c.extends;
    if (!parent) continue;
    const list = children.get(parent) ?? [];
    list.push(c.name);
    children.set(parent, list);
  }
  return children;
}

function descendants(name: string, children: Map<string, string[]>): string[] {
  const out: string[] = [];
  const stack = [...(children.get(name) ?? [])];
  while (stack.length) {
    const next = stack.pop()!;
    if (out.includes(next)) continue;
    out.push(next);
    stack.push(...(children.get(next) ?? []));
  }
  return out;
}

/** Build instance paths for every documented class. */
export function buildAccessPathIndex(docs: Pick<DocOutput, 'classes'>): AccessPathIndex {
  const classes = docs.classes;
  const byName = new Map(classes.map((c) => [c.name, c]));
  const known = new Set(byName.keys());
  const classPaths = new Map<string, string[]>();

  for (const c of classes) {
    if (isGhostSymbol(c.name)) continue;
    const paths = [
      ...instanceNames(c.name),
      ...extractBacktickPaths(c.description).filter((p) => !looksLikeMethodPath(p)),
    ];
    classPaths.set(c.name, paths);
  }

  for (let depth = 0; depth < 3; depth++) {
    for (const from of classes) {
      const fromPaths = classPaths.get(from.name) ?? instanceNames(from.name);
      for (const prop of from.properties ?? []) {
        const target = outerTypeName(prop.type);
        if (!target || !known.has(target)) continue;
        const next = classPaths.get(target) ?? [];
        for (const prefix of fromPaths) {
          if (prefix.split('.').length >= 3) continue;
          next.push(`${prefix}.${prop.name}`);
        }
        classPaths.set(target, unique(next));
      }
    }
  }

  for (const [name, paths] of classPaths) {
    classPaths.set(
      name,
      unique(paths.filter((p) => !looksLikeMethodPath(p))).sort(
        (a, b) => pathRank(a) - pathRank(b) || a.length - b.length,
      ),
    );
  }

  return { classPaths };
}

function pathRank(path: string): number {
  const idx = PREFERRED_PREFIXES.findIndex((p) => path === p.slice(0, -1) || path.startsWith(p));
  return idx === -1 ? PREFERRED_PREFIXES.length : idx;
}

/** Best single path to show in UI (`client.user` over `clientUser`). */
export function preferredPath(paths: string[]): string | undefined {
  if (!paths.length) return undefined;
  return [...paths].sort((a, b) => pathRank(a) - pathRank(b) || a.length - b.length)[0];
}

/**
 * Paths that can reach members declared on `className`.
 * Includes paths to subclasses so `User` methods match `client.user.avatarURL`.
 */
export function pathsForMembersOf(
  className: string,
  index: AccessPathIndex,
  classes: DocClass[],
): string[] {
  const children = subclassesOf(classes);
  const names = [className, ...descendants(className, children)];
  const paths: string[] = [];
  for (const name of names) {
    paths.push(...(index.classPaths.get(name) ?? []));
  }
  return unique(paths.filter((p) => !looksLikeMethodPath(p))).sort(
    (a, b) => pathRank(a) - pathRank(b) || a.length - b.length,
  );
}

/**
 * Instance or nested path -> owning class (`channel` -> Channel, `guild.members` -> GuildMemberManager).
 * Canonical INSTANCE_ALIASES win when several classes share a short name.
 */
export function buildPathOwnerIndex(access: AccessPathIndex): Map<string, string> {
  const map = new Map<string, string>();
  for (const [className, aliases] of Object.entries(INSTANCE_ALIASES)) {
    for (const alias of aliases) {
      if (!map.has(alias)) map.set(alias, className);
    }
  }
  for (const [className, paths] of access.classPaths) {
    for (const p of paths) {
      if (!map.has(p)) map.set(p, className);
    }
  }
  return map;
}

/** `client.user.leaveGuild` for a member on a class. */
export function memberAccessPaths(
  className: string,
  memberName: string,
  index: AccessPathIndex,
  classes: DocClass[],
): string[] {
  return pathsForMembersOf(className, index, classes).map((p) => `${p}.${memberName}`);
}

export function splitCamelCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toLowerCase();
}

/** Method, property, and enum member names for sidebar / index filtering. */
export function symbolMemberNames(symbol: DocClass | DocInterface | DocEnum): string {
  if (symbol.kind === 'enum') {
    return (symbol.members ?? []).map((m) => m.name).join(' ');
  }
  const props = (symbol.properties ?? []).map((p) => p.name);
  const methods = (symbol.methods ?? []).map((m) => m.name);
  const extras = [...props, ...methods].flatMap((n) => {
    const extra = METHOD_ACTION_KEYWORDS[n];
    return extra ? [extra] : [];
  });
  return [...props, ...methods, ...extras].join(' ');
}
