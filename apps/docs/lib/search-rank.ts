import type { SearchItem } from './search-index';

/** Methods people look up first when writing a bot. Lower is better. */
const FEATURED_MEMBERS = new Map<string, number>([
  ['method:Channel:delete', -0.2],
  ['method:Channel:send', -0.2],
  ['method:Message:reply', -0.2],
  ['method:Message:resolveChannel', -0.2],
  ['method:PartialMessage:resolveChannel', -0.18],
  ['method:Message:resolveGuild', -0.15],
  ['method:Client:login', -0.2],
  ['method:ChannelManager:fetch', -0.1],
  ['property:Client:uptime', -0.25],
  ['property:WebSocketManager:ping', -0.25],
]);

/**
 * Synonym queries that should land on gateway/client status, not REST round-trips
 * or reply-ping options.
 */
const QUERY_ALIASES: Record<string, string[]> = {
  uptime: ['property:Client:uptime'],
  ping: ['property:WebSocketManager:ping'],
  latency: ['property:WebSocketManager:ping'],
  heartbeat: ['property:WebSocketManager:ping'],
  rtt: ['property:WebSocketManager:ping'],
};

export function normalizeSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/#/g, '.')
    .replace(/\(\s*\)\s*$/, '')
    .toLowerCase();
}

function invertPhrase(q: string): string | undefined {
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length !== 2) return undefined;
  return `${words[1]}.${words[0]}`;
}

/**
 * Lower is better. Exact dotted paths and method names beat fuzzy class matches.
 * "delete channel" ranks `channel.delete` the same as `Channel#delete`.
 */
export function scoreSearchItem(query: string, item: SearchItem, fuseScore = 1): number {
  const q = normalizeSearchQuery(query);
  if (!q) return 50;
  const title = item.title.replace(/\(\)$/, '').toLowerCase();
  const path = (item.path ?? title).replace(/\(\)$/, '').toLowerCase();
  const name = (item.name ?? '').toLowerCase();
  const owner = (item.owner ?? '').toLowerCase();
  const last = q.includes('.') ? (q.split('.').pop() ?? q) : q;
  const isMember = item.kind === 'method' || item.kind === 'property';
  const inverted = invertPhrase(q);
  const tokens = q.split(/[\s.#]+/).filter(Boolean);
  const featured = FEATURED_MEMBERS.get(item.id) ?? 0;
  const aliased = QUERY_ALIASES[q]?.includes(item.id) === true;

  if (aliased) return -0.4 + featured;
  if (path === q || title === q) return featured;
  if (inverted && (path === inverted || title === inverted || path.endsWith(inverted))) {
    return 0.02 + featured;
  }
  if (isMember && name === q) return 0.05 + featured;
  if (isMember && name === last && q.includes('.')) return 0.08 + featured;
  if (
    isMember &&
    tokens.includes(name) &&
    tokens.some((t) => owner.includes(t) || path.includes(t))
  ) {
    return 0.06 + featured;
  }
  if (path.endsWith(`.${last}`) && name === last) return 0.1 + featured;
  if (path.startsWith(q) || title.startsWith(q)) return 0.15 + featured;
  if (name === last) return (isMember ? 0.2 : 0.35) + featured;
  if (title.includes(q) || path.includes(q)) return 0.3 + featured;
  return 0.45 + fuseScore + featured;
}

export function rankSearchItems(
  query: string,
  hits: { item: SearchItem; score?: number }[],
): SearchItem[] {
  return [...hits]
    .map((h) => ({
      item: h.item,
      rank: scoreSearchItem(query, h.item, h.score ?? 1),
    }))
    .sort((a, b) => a.rank - b.rank)
    .map((h) => h.item);
}
