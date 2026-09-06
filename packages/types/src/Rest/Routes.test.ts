import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { Routes } from './Routes.js';

const OPENAPI_FILE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../vendor/openapi/fluxer-api.json',
);

type OpenAPIDoc = {
  paths: Record<string, unknown>;
};

function loadOpenAPIPaths(): ReadonlySet<string> {
  const doc = JSON.parse(readFileSync(OPENAPI_FILE, 'utf8')) as OpenAPIDoc;
  return new Set(Object.keys(doc.paths));
}

/** True when a concrete Routes path (query stripped) matches an OpenAPI `{param}` template. */
function pathMatchesTemplate(concrete: string, template: string): boolean {
  const pathname = concrete.split('?')[0] ?? concrete;
  const pattern = template
    .split(/(\{[^}]+\})/)
    .map((part) => (part.startsWith('{') ? '[^/]+' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('');
  return new RegExp(`^${pattern}$`).test(pathname);
}

const G = 'g1';
const C = 'c1';
const M = 'm1';
const U = 'u1';
const R = 'r1';
const E = 'e1';
const S = 's1';
const W = 'w1';
const T = 'tok';
const A = 'a1';
const O = 'o1';
const EMOJI = '❤';

/**
 * Every `Routes.*` builder → OpenAPI path template.
 * Sample args produce concrete paths that must match the template and exist in OpenAPI.
 */
const ROUTE_OPENAPI: {
  readonly [K in keyof typeof Routes]: {
    readonly openapi: string;
    readonly call: () => string;
  };
} = {
  channel: { openapi: '/channels/{channel_id}', call: () => Routes.channel(C) },
  channelMessages: {
    openapi: '/channels/{channel_id}/messages',
    call: () => Routes.channelMessages(C),
  },
  channelMessage: {
    openapi: '/channels/{channel_id}/messages/{message_id}',
    call: () => Routes.channelMessage(C, M),
  },
  channelMessageReactions: {
    openapi: '/channels/{channel_id}/messages/{message_id}/reactions',
    call: () => Routes.channelMessageReactions(C, M),
  },
  channelMessageReaction: {
    openapi: '/channels/{channel_id}/messages/{message_id}/reactions/{emoji}',
    call: () => Routes.channelMessageReaction(C, M, EMOJI),
  },
  channelMessageReactionMe: {
    openapi: '/channels/{channel_id}/messages/{message_id}/reactions/{emoji}/@me',
    call: () => Routes.channelMessageReactionMe(C, M, EMOJI),
  },
  channelMessageReactionUsers: {
    openapi: '/channels/{channel_id}/messages/{message_id}/reactions/{emoji}/users',
    call: () => Routes.channelMessageReactionUsers(C, M, EMOJI),
  },
  channelMessageReactionUser: {
    openapi: '/channels/{channel_id}/messages/{message_id}/reactions/{emoji}/{target_id}',
    call: () => Routes.channelMessageReactionUser(C, M, EMOJI, U),
  },
  channelPins: {
    openapi: '/channels/{channel_id}/messages/pins',
    call: () => Routes.channelPins(C),
  },
  channelPinMessage: {
    openapi: '/channels/{channel_id}/pins/{message_id}',
    call: () => Routes.channelPinMessage(C, M),
  },
  channelBulkDelete: {
    openapi: '/channels/{channel_id}/messages/bulk-delete',
    call: () => Routes.channelBulkDelete(C),
  },
  channelBulkDeleteMine: {
    openapi: '/channels/{channel_id}/messages/bulk-delete-mine',
    call: () => Routes.channelBulkDeleteMine(C),
  },
  channelMessagesAck: {
    openapi: '/channels/{channel_id}/messages/ack',
    call: () => Routes.channelMessagesAck(C),
  },
  channelMessagesPurge: {
    openapi: '/channels/{channel_id}/messages/purge',
    call: () => Routes.channelMessagesPurge(C),
  },
  channelPinsAck: {
    openapi: '/channels/{channel_id}/pins/ack',
    call: () => Routes.channelPinsAck(C),
  },
  channelAttachments: {
    openapi: '/channels/{channel_id}/attachments',
    call: () => Routes.channelAttachments(C),
  },
  channelAttachmentsComplete: {
    openapi: '/channels/{channel_id}/attachments/complete',
    call: () => Routes.channelAttachmentsComplete(C),
  },
  channelsMessagesBulk: {
    openapi: '/channels/messages/bulk',
    call: () => Routes.channelsMessagesBulk(),
  },
  channelWebhooks: {
    openapi: '/channels/{channel_id}/webhooks',
    call: () => Routes.channelWebhooks(C),
  },
  channelTyping: { openapi: '/channels/{channel_id}/typing', call: () => Routes.channelTyping(C) },
  channelRtcRegions: {
    openapi: '/channels/{channel_id}/rtc-regions',
    call: () => Routes.channelRtcRegions(C),
  },
  channelSlowmode: {
    openapi: '/channels/{channel_id}/slowmode',
    call: () => Routes.channelSlowmode(C),
  },
  channelInvites: {
    openapi: '/channels/{channel_id}/invites',
    call: () => Routes.channelInvites(C),
  },
  channelPermission: {
    openapi: '/channels/{channel_id}/permissions/{overwrite_id}',
    call: () => Routes.channelPermission(C, O),
  },
  channelRecipient: {
    openapi: '/channels/{channel_id}/recipients/{user_id}',
    call: () => Routes.channelRecipient(C, U),
  },
  channelMessageAttachment: {
    openapi: '/channels/{channel_id}/messages/{message_id}/attachments/{attachment_id}',
    call: () => Routes.channelMessageAttachment(C, M, A),
  },

  guilds: { openapi: '/guilds', call: () => Routes.guilds() },
  guild: { openapi: '/guilds/{guild_id}', call: () => Routes.guild(G) },
  guildDelete: { openapi: '/guilds/{guild_id}/delete', call: () => Routes.guildDelete(G) },
  guildVanityUrl: {
    openapi: '/guilds/{guild_id}/vanity-url',
    call: () => Routes.guildVanityUrl(G),
  },
  guildTransferOwnership: {
    openapi: '/guilds/{guild_id}/transfer-ownership',
    call: () => Routes.guildTransferOwnership(G),
  },
  guildRolesHoistPositions: {
    openapi: '/guilds/{guild_id}/roles/hoist-positions',
    call: () => Routes.guildRolesHoistPositions(G),
  },
  guildEmojisBulk: {
    openapi: '/guilds/{guild_id}/emojis/bulk',
    call: () => Routes.guildEmojisBulk(G),
  },
  guildEmojisClone: {
    openapi: '/guilds/{guild_id}/emojis/clone',
    call: () => Routes.guildEmojisClone(G),
  },
  guildStickersBulk: {
    openapi: '/guilds/{guild_id}/stickers/bulk',
    call: () => Routes.guildStickersBulk(G),
  },
  guildStickersClone: {
    openapi: '/guilds/{guild_id}/stickers/clone',
    call: () => Routes.guildStickersClone(G),
  },
  guildDiscovery: {
    openapi: '/guilds/{guild_id}/discovery',
    call: () => Routes.guildDiscovery(G),
  },
  guildChannels: { openapi: '/guilds/{guild_id}/channels', call: () => Routes.guildChannels(G) },
  guildMembers: { openapi: '/guilds/{guild_id}/members', call: () => Routes.guildMembers(G) },
  guildMembersSearch: {
    openapi: '/guilds/{guild_id}/members-search',
    call: () => Routes.guildMembersSearch(G),
  },
  guildMember: {
    openapi: '/guilds/{guild_id}/members/{user_id}',
    call: () => Routes.guildMember(G, U),
  },
  guildMemberMe: {
    openapi: '/guilds/{guild_id}/members/@me',
    call: () => Routes.guildMemberMe(G),
  },
  guildMemberRole: {
    openapi: '/guilds/{guild_id}/members/{user_id}/roles/{role_id}',
    call: () => Routes.guildMemberRole(G, U, R),
  },
  guildRoles: { openapi: '/guilds/{guild_id}/roles', call: () => Routes.guildRoles(G) },
  guildRole: {
    openapi: '/guilds/{guild_id}/roles/{role_id}',
    call: () => Routes.guildRole(G, R),
  },
  guildBans: { openapi: '/guilds/{guild_id}/bans', call: () => Routes.guildBans(G) },
  guildBan: { openapi: '/guilds/{guild_id}/bans/{user_id}', call: () => Routes.guildBan(G, U) },
  guildInvites: { openapi: '/guilds/{guild_id}/invites', call: () => Routes.guildInvites(G) },
  invite: { openapi: '/invites/{invite_code}', call: () => Routes.invite('abc123') },
  guildAuditLogs: {
    openapi: '/guilds/{guild_id}/audit-logs',
    call: () => Routes.guildAuditLogs(G),
  },
  guildEmojis: { openapi: '/guilds/{guild_id}/emojis', call: () => Routes.guildEmojis(G) },
  guildEmoji: {
    openapi: '/guilds/{guild_id}/emojis/{emoji_id}',
    call: () => Routes.guildEmoji(G, E),
  },
  guildStickers: { openapi: '/guilds/{guild_id}/stickers', call: () => Routes.guildStickers(G) },
  guildSticker: {
    openapi: '/guilds/{guild_id}/stickers/{sticker_id}',
    call: () => Routes.guildSticker(G, S),
  },
  guildWebhooks: { openapi: '/guilds/{guild_id}/webhooks', call: () => Routes.guildWebhooks(G) },
  webhook: { openapi: '/webhooks/{webhook_id}', call: () => Routes.webhook(W) },
  webhookExecute: {
    openapi: '/webhooks/{webhook_id}/{token}',
    call: () => Routes.webhookExecute(W, T),
  },
  webhookMessage: {
    openapi: '/webhooks/{webhook_id}/{token}/messages/{message_id}',
    call: () => Routes.webhookMessage(W, T, M),
  },

  user: { openapi: '/users/{user_id}', call: () => Routes.user(U) },
  currentUser: { openapi: '/users/@me', call: () => Routes.currentUser() },
  currentUserGuilds: { openapi: '/users/@me/guilds', call: () => Routes.currentUserGuilds() },
  leaveGuild: { openapi: '/users/@me/guilds/{guild_id}', call: () => Routes.leaveGuild(G) },
  guildBulkDeleteMine: {
    openapi: '/users/@me/guilds/{guild_id}/messages/bulk-delete-mine',
    call: () => Routes.guildBulkDeleteMine(G),
  },
  userMeChannels: { openapi: '/users/@me/channels', call: () => Routes.userMeChannels() },
  userMeChannelPin: {
    openapi: '/users/@me/channels/{channel_id}/pin',
    call: () => Routes.userMeChannelPin(C),
  },
  userProfile: {
    openapi: '/users/{target_id}/profile',
    call: () => Routes.userProfile(U),
  },

  instanceDiscovery: { openapi: '/.well-known/fluxer', call: () => Routes.instanceDiscovery() },
  gatewayBot: { openapi: '/gateway/bot', call: () => Routes.gatewayBot() },
  applicationsMe: { openapi: '/applications/@me', call: () => Routes.applicationsMe() },
  oauth2ApplicationsMe: {
    openapi: '/oauth2/applications/@me',
    call: () => Routes.oauth2ApplicationsMe(),
  },
  emojiMetadata: {
    openapi: '/emojis/{emoji_id}/metadata',
    call: () => Routes.emojiMetadata(E),
  },
  stickerMetadata: {
    openapi: '/stickers/{sticker_id}/metadata',
    call: () => Routes.stickerMetadata(S),
  },
  checkUsernameTag: { openapi: '/users/check-tag', call: () => Routes.checkUsernameTag() },
  preloadMessages: {
    openapi: '/users/@me/preload-messages',
    call: () => Routes.preloadMessages(),
  },
  preloadMessagesAlt: {
    openapi: '/users/@me/channels/messages/preload',
    call: () => Routes.preloadMessagesAlt(),
  },
  streamPreview: {
    openapi: '/streams/{stream_key}/preview',
    call: () => Routes.streamPreview('key'),
  },
  searchMessages: { openapi: '/search/messages', call: () => Routes.searchMessages() },

  oauth2ApplicationBot: {
    openapi: '/oauth2/applications/{id}/bot',
    call: () => Routes.oauth2ApplicationBot(A),
  },
  oauth2ApplicationBotResetToken: {
    openapi: '/oauth2/applications/{id}/bot/reset-token',
    call: () => Routes.oauth2ApplicationBotResetToken(A),
  },
};

describe('Routes ⊆ OpenAPI', () => {
  const openapiPaths = loadOpenAPIPaths();

  it('enumerates every Routes builder exactly once', () => {
    expect(Object.keys(ROUTE_OPENAPI).sort()).toEqual(Object.keys(Routes).sort());
  });

  it.each(
    (
      Object.entries(ROUTE_OPENAPI) as [
        keyof typeof Routes,
        (typeof ROUTE_OPENAPI)[keyof typeof Routes],
      ][]
    ).map(([name, spec]) => [name, spec.openapi, spec] as const),
  )('%s → %s', (name, openapi, { call }) => {
    expect(openapiPaths.has(openapi), `${String(name)} → missing OpenAPI path ${openapi}`).toBe(
      true,
    );
    const built = call();
    expect(
      pathMatchesTemplate(built, openapi),
      `${String(name)}()=${built} does not match ${openapi}`,
    ).toBe(true);
  });
});

describe('Routes encoding & query behavior', () => {
  describe('channelMessageReaction', () => {
    it('encodes unicode emoji in URL', () => {
      const path = Routes.channelMessageReaction('123', '456', '❤');
      expect(path).toContain(encodeURIComponent('❤'));
      expect(path).toMatch(/reactions\/[^/]+\/?/);
    });

    it('encodes custom emoji name:id format', () => {
      const path = Routes.channelMessageReaction('123', '456', 'custom:123456789012345678');
      expect(path).toContain(encodeURIComponent('custom:123456789012345678'));
    });

    it('does not double-encode already encoded input', () => {
      const encoded = encodeURIComponent('❤');
      const path = Routes.channelMessageReaction('123', '456', encoded);
      expect(path).toContain('%25E2%259D%25A4'); // double-encoded
    });
  });

  it('invite encodes special characters', () => {
    expect(Routes.invite('abc123')).toBe('/invites/abc123');
    expect(Routes.invite('code+with/special')).toContain(encodeURIComponent('code+with/special'));
  });

  it('streamPreview encodes stream key', () => {
    const path = Routes.streamPreview('key+with/special');
    expect(path).toContain('/streams/');
    expect(path).toContain(encodeURIComponent('key+with/special'));
  });

  it('userProfile omits or appends guild_id query', () => {
    expect(Routes.userProfile('uid')).toBe('/users/uid/profile');
    expect(Routes.userProfile('uid', 'gid')).toBe('/users/uid/profile?guild_id=gid');
  });
});
