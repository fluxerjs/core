/**
 * A single changelog bullet. Use a plain string for short notes, or the object
 * form to pair a bold one-line summary with a longer plain-language explanation.
 */
export type ChangelogItem = string | { summary: string; detail?: string };

export interface ChangelogSection {
  title: string;
  items: ChangelogItem[];
}

export interface ChangelogEntry {
  version: string;
  date: string;
  /** Short plain-language overview shown under the version header. */
  summary?: string;
  /** GitHub pull request number, shown with the GitHub mark. */
  pr?: number;
  /** Explicit GitHub URL (compare, release, or PR). Overrides the default compare link. */
  github?: string;
  sections: ChangelogSection[];
}

/** Hand-authored release notes for the docs site. */
export const changelogEntries: ChangelogEntry[] = [
  {
    version: '3.0.0',
    date: '2026-08-23',
    github: 'https://github.com/fluxerjs/core/compare/v2.2.0...main',
    summary:
      'DX overhaul: domain wrappers with native methods (fetch then channel.send / channel.delete), PartialMessage / PartialGuildMember for uncached deletes and removes, camelCase nested message fields, collector bounds, AttachmentBuilder, process sharding packages, and @fluxerjs/core/internal for wire serializers. Also removes expression packs, CompactAttachments, pack invite types, and the old overwrite helpers. Upgrade steps: /guides/upgrading-to-3/.',
    sections: [
      {
        title: 'Breaking Changes',
        items: [
          {
            summary: 'MessageDelete is PartialMessage, not Message',
            detail:
              'The payload has id, channelId, guildId, channel, content, authorId, and author / createdAt when the message was cached. It has fetch() and resolveChannel(). It does not have edit, reply, or react. Use message.partial or Message.resolve(msg) when a handler accepts both Message and PartialMessage.',
          },
          {
            summary: 'Uncached MessageUpdate is PartialMessage',
            detail:
              'Cached edits still emit Message. Uncached edits emit PartialMessage. Check message.partial before reading content, author, or calling reply.',
          },
          {
            summary: 'GuildMemberRemove is GuildMember | PartialGuildMember',
            detail:
              'If the member was not in cache, you get a PartialGuildMember class (partial: true) with id, guildId, user, and guild. Check member.partial or fetch before using nick, roles, or kick.',
          },
          {
            summary: 'MessageDeleteBulk includes messages: PartialMessage[]',
            detail:
              'The bulk payload still has the channel and ids. messages is the per-id list so you can fetch or inspect cached content without a second lookup.',
          },
          {
            summary: 'Channel.send and Channel.delete are on Channel',
            detail:
              'client.channels.fetch(id) and message.resolveChannel() return Channel with those methods. send is on text-capable channels (guild text, guild voice, DMs). Category and link channels do not have send. You do not need a GuildChannel cast or a raw REST Routes.channel call for the usual case.',
          },
          {
            summary: 'message.channel is a text-capable channel or null',
            detail:
              'When the channel is in cache it is already a text-based structure (including voice), so reply and send type-check. When it is missing, it is null; call message.resolveChannel() then send or delete.',
          },
          {
            summary: 'Nested attachment, embed, and invite fields are camelCase',
            detail:
              'Attachments are MessageAttachment (proxyUrl, contentType). Embeds are MessageEmbed (iconUrl, proxyUrl, htmlWidth). messageReference, invite snapshots, and call.endedAt follow the same rule. Sending still uses EmbedBuilder. If you compared snake_case fields on received messages, update those reads.',
          },
          {
            summary: 'isTextBased() and isGuild() use ChannelType',
            detail:
              "They do not duck-type `'send' in this` or `'guildId' in this`. Custom subclasses that faked methods without setting type will fail the guard.",
          },
          {
            summary: 'Sweep filters receive Message, not raw APIMessage',
            detail:
              'client.cache.sweepMessages((msg) => …) sees createdAt as a Date and the usual Message getters. Internal storage is still the wire object.',
          },
          {
            summary: 'Guild.createChannel options are camelCase',
            detail:
              'Use parentId and rateLimitPerUser (not parent_id / rate_limit_per_user). Same camelCase rule as guild.edit and channel.edit in 2.x.',
          },
          {
            summary: 'login() returns this',
            detail:
              'Was Promise<string> (the token) in older lines. Chain login or ignore the resolved value.',
          },
          {
            summary: 'ClientOptions.intents is deprecated and ignored',
            detail:
              'Fluxer does not use Discord-style gateway intents. Omit intents; use ignoredEvents to suppress specific dispatches.',
          },
          {
            summary: 'Collectors require time and/or max',
            detail:
              'CollectorOptionsRequired. By default awaitMessages / awaitReactions reject on idle (CollectorIdle) and max (CollectorMax). Pass errors: ["time"] when max should resolve successfully.',
          },
          {
            summary: 'message.reactions is MessageReactionManager',
            detail:
              'Use .cache for the reaction collection. Not a bare array or map of wire reaction objects.',
          },
          {
            summary: 'message.flags is MessageFlagsBitField',
            detail: 'Not a raw number. Same bitfield pattern as permissions.',
          },
          {
            summary: 'AttachmentBuilder(file, { name }) requires a name',
            detail:
              'Pass a Buffer or URL plus options.name, then files: [builder] on send / reply / edit.',
          },
          {
            summary: 'Invite snapshots replace live guild/channel fields',
            detail:
              'Metadata is guildSnapshot / channelSnapshot. Call resolveGuild() or resolveChannel() for live structures.',
          },
          {
            summary: 'embeds: [] on edit clears embeds',
            detail: 'Omit the embeds field to leave existing embeds unchanged.',
          },
          {
            summary: 'Wire serializers moved to @fluxerjs/core/internal',
            detail:
              'Prefer structure methods on domain objects. Import @fluxerjs/core/internal only when calling REST with raw camelCase→wire helpers. Pack* serializers are gone with the pack API.',
          },
          {
            summary: 'client.packs and Pack* types are removed',
            detail:
              'PackManager, PackCreateOptions, PackInvitePayload, and the rest of the pack exports are gone. Use guild emoji/sticker CRUD (createEmoji, cloneEmoji, createSticker). InviteType.EmojiPack and InviteType.StickerPack are also gone; invites are guild or group-DM only.',
          },
          {
            summary: 'MessageFlags.CompactAttachments and MT_* guild features are removed',
            detail:
              'CompactAttachments is no longer a MessageFlags member. GuildFeature no longer includes MT_MESSAGE_SCHEDULING or MT_EXPRESSION_PACKS. Align flag checks with the current OpenAPI snapshot.',
          },
          {
            summary: 'channel.permissionOverwrites is a PermissionOverwriteManager',
            detail:
              'It is no longer APIChannelOverwrite[]. channel.editPermission and channel.deletePermission are gone. Use channel.permissionOverwrites.edit(id, { type, allow, deny }) and .delete(id). Iterate .cache or the manager itself.',
          },
          {
            summary: 'message.stickers are MessageSticker, not APIMessageSticker',
            detail:
              'Each sticker is a domain object with name, tags, animated, and url. messageSnapshots use the same camelCase wrappers as the parent message.',
          },
          {
            summary: 'GuildRoleUpdate and GuildRoleDelete are positional, not one payload object',
            detail:
              '2.2 emitted ({ oldRole, role }) and ({ role, guildId, roleId }). 3.0 emits (oldRole, role) and (role, guildId, roleId). oldRole / role are null when the role was uncached. GuildRoleCreate is still a single Role.',
          },
        ],
      },
      {
        title: 'Added',
        items: [
          {
            summary: '@fluxerjs/sharding: ShardingManager, one process per shard',
            detail:
              'IPC between parent and children, ShardClientUtil inside the bot file, and a parent identify throttler. See examples/sharded-bot.js and /guides/sharding/.',
          },
          {
            summary: '@fluxerjs/sharding-redis: Redis coordinator and session store',
            detail:
              'Optional Redis-backed shard leases and gateway session persistence for multi-host deployments. Pair with @fluxerjs/ws session store APIs.',
          },
          {
            summary: 'client.ws.ping and in-process sharding helpers on @fluxerjs/ws',
            detail:
              'Heartbeat ACK RTT (-1 before the first ACK). Sharded clients expose an average and client.ws.getShard(id)?.ping. Also SimpleShardingStrategy, WorkerShardingStrategy, IdentifyThrottler, and SessionStore.',
          },
          {
            summary: 'client.uptime',
            detail: 'Milliseconds since Ready, or null before login completes.',
          },
          {
            summary: 'PartialMessage and PartialGuildMember',
            detail:
              'Public types with partial: true, fetch() (messages), and the ids the gateway actually sent. Message.resolve() turns Message | PartialMessage into a full Message when you need one.',
          },
          {
            summary: 'channel.awaitMessages and message.awaitReactions',
            detail:
              'Promise wrappers over the existing collectors. Require time and/or max. By default, idle and max reject with CollectorIdle / CollectorMax; pass errors: ["time"] when max should resolve successfully.',
          },
          {
            summary: 'GuildMember.kick, ban, and timeout',
            detail:
              'Methods on the member you already have from message.member or guild.members.fetch. message.member is a getter onto the guild member cache.',
          },
          {
            summary: 'users.resolve and Invite.resolveGuild / resolveChannel',
            detail:
              'Resolve a user from cache by id or a User-like value. Invite metadata is guildSnapshot / channelSnapshot; call resolveGuild() or resolveChannel() for live structures.',
          },
          {
            summary: 'role.has(permission)',
            detail: 'Alias of role.permissions.has for shorter permission checks.',
          },
          'Reaction.fetchMessage() is cache-first, then REST',
          'isGuild / isText / isCategory / isVoice / isLink on Channel',
          'PermissionOverwrite / PermissionOverwriteManager and GuildRoleManager (guild.roles.everyone)',
        ],
      },
      {
        title: 'Changed',
        items: [
          {
            summary: 'Prefer channel.send and channel.delete',
            detail:
              'Guides and examples use const channel = await client.channels.fetch(id) then channel.send / channel.delete. client.channels.send, message.sendTo, and REST Routes.channel are still there if you only have an id. Manager .delete() is still cache-only (it does not hit HTTP).',
          },
          {
            summary: 'Collectors still unwrap reaction events',
            detail:
              'Gateway messageReactionAdd is one payload object. Collectors still call your filter and collect handlers as (reaction, user). Leave collector callbacks alone unless you dropped collectors.',
          },
          {
            summary: 'Role event shapes stay structure-first',
            detail:
              'GuildRoleCreate still emits Role. GuildRoleUpdate and GuildRoleDelete switched from a single payload object in 2.2 to positional arguments in 3.0 (see Breaking Changes).',
          },
          'examples/sharded-bot.js added. Other examples use fetch, member.kick, AttachmentBuilder, and resolveChannel.',
        ],
      },
      {
        title: 'Fixed',
        items: [
          'Uncached deletes no longer type-check as if author and createdAt always exist.',
          'Channel methods exist on the same type client.channels.fetch returns.',
          'Guild voice channels are text-capable: isTextBased(), send, and message.channel.',
          'Guild channel cache indexing uses isGuild() instead of a guildId own-property check.',
          'OpenAPI nick / communication_disabled_until optionality already matched Fluxer; no extra type churn from [fluxerapp/fluxer#1522](https://github.com/fluxerapp/fluxer/pull/1522)',
          {
            summary: 'REST retries honor Retry-After as a fallback',
            detail:
              'On 429, the client waits JSON retry_after when present, otherwise the Retry-After header (including non-JSON bodies). Retryable 5xx uses Retry-After when set, otherwise the usual backoff.',
          },
        ],
      },
      {
        title: 'Docs',
        items: [
          'Dedicated Upgrading to 3.0 guide with the DX breaking-change index (/guides/upgrading-to-3/). Migrating to 2.0 stays at /guides/migration/.',
          'Voice channels are documented as text-capable. Bots should use preloadMessages instead of bulkFetchMessages.',
          'Expression packs are no longer advertised; guild emoji/sticker CRUD remains.',
          'Sharding guide covering ShardingManager, worker strategy, and Redis coordination (marked advanced).',
          'Getting Started path: install → basic bot → prefix → errors → caching. Upgrading guides sit in their own sidebar category.',
          'Channels, sending, events, collectors, attachments (AttachmentBuilder), and moderation guides updated for 3.0 types.',
          'Where do I...? task index, content warnings, server discovery (apply, not join), users/FriendlyBot, forwards, vanity URLs, emoji clone/bulk, and history-bot.',
          'Guides index groups now have blurbs and a task jump list. Search indexes optional guide searchTerms.',
        ],
      },
    ],
  },
  {
    version: '2.2.0',
    date: '2026-08-01',
    summary:
      'A large client cache rebuild (LimitedCollection + client.cache), Tenor replaced with Klipy for GIF helpers, and a refreshed OpenAPI snapshot with tighter types. Most other breaking changes are import-path moves and small behavior tweaks; the migration notes below walk through each one.',
    sections: [
      {
        title: 'Breaking Changes',
        items: [
          {
            summary: 'Tenor GIF helpers replaced with Klipy',
            detail:
              'resolveTenorToImageUrl and related Tenor exports are removed. Use resolveKlipyToImageUrl (and KlipyMediaResult) from @fluxerjs/core or @fluxerjs/util. Fluxer’s unfurler expects Klipy page URLs in message content; see /guides/gifs/.',
          },
          {
            summary: 'Disabling the message cache now uses messages: false, not messages: 0',
            detail:
              'To match the rest of the cache options, a numeric 0 (and other documented numeric zeros) now means "unbounded / no limit" instead of "off". If you passed cache: { messages: 0 } to turn message caching off, it will now cache every message. Use cache: { messages: false } to disable it.',
          },
          {
            summary: 'Deep file imports moved; import from package entrypoints instead',
            detail:
              'Internal layout was reorganized (guild/message structures, sdk options modules, util helpers). Paths like @fluxerjs/core/structures/Guild.ts no longer resolve. Import public names from the package root or documented subpaths (@fluxerjs/core, @fluxerjs/core/client, @fluxerjs/core/message, @fluxerjs/core/cluster, @fluxerjs/core/errors).',
          },
          {
            summary: 'formatEmoji custom output is now name:id (previously :name:id)',
            detail:
              'The leading colon was dropped from the custom-emoji form, and unicode emoji are no longer passed through encodeURIComponent. Update any code that parsed or compared the old :name:id shape.',
          },
          {
            summary: 'Animated emoji identifiers now include the a: prefix (a:name:id)',
            detail:
              'GuildEmoji.identifier and MessageReaction.emojiIdentifier return a:name:id for animated emoji so they round-trip correctly through the API. Static emoji are unchanged and still return name:id.',
          },
          {
            summary: 'message.react() always emits a local messageReactionAdd after the REST call',
            detail:
              'Once the reaction request succeeds, the client emits messageReactionAdd with a structured emoji object ({ name, id?, animated? }) instead of putting the raw wire string into emoji.name. Your listeners and collectors now see the same shape whether the reaction came from you or from the gateway.',
          },
          {
            summary: 'EmbedBuilder.toJSON() always includes description (null when unset)',
            detail:
              'The description field was previously omitted when it had no value. If you snapshot or diff embed JSON, expect an explicit description: null to appear.',
          },
          {
            summary: 'WebSocket identify intents is now optional and defaults to 0',
            detail:
              'Fluxer ignores the legacy Discord-style intents value, so you can drop it entirely. If your code required intents: N, pass intents: 0 or simply omit it.',
          },
          {
            summary: 'Stricter request validation may reject bodies that used to be accepted',
            detail:
              'The vendored OpenAPI snapshot was refreshed against live Fluxer, which tightened nullability on some channel and guild request fields. Payloads that were loosely typed before may now be rejected; align them with the refreshed snapshot.',
          },
        ],
      },
      {
        title: 'Added',
        items: [
          {
            summary: 'LimitedCollection: a bounded cache with FIFO eviction (@fluxerjs/collection)',
            detail:
              'A drop-in Collection that enforces a maximum size, evicting the oldest entries first, with an onEvict callback so you can react when items are dropped.',
          },
          {
            summary: 'client.cache controller for inspecting and clearing caches',
            detail:
              'Read cache stats, run manual sweeps, and cascade-teardown related data across guilds, channels, members, messages, roles, emojis, and stickers from one place.',
          },
          {
            summary: 'Identity-preserving guild snapshots on READY / GUILD_CREATE',
            detail:
              'When a guild is re-sent, its nested caches (members, channels, roles, and so on) are retained on the same guild instance instead of being rebuilt, so existing references stay valid.',
          },
          {
            summary: 'resolveKlipyToImageUrl for embedding Klipy GIFs',
            detail:
              'Resolves a klipy.com page URL to a direct media URL (and animated flags) for EmbedBuilder.setImage. Send the page URL as message content when you want the native gifv unfurl instead.',
          },
          {
            summary: 'ClientEvents payload types exported from @fluxerjs/core',
            detail:
              'Every camelCase ClientEvents payload type (including helpers like GuildRoleUpdatePayload) is public, plus ClientEventName and ClientEventListener for typed listeners.',
          },
          'ClientUser.fetch() and ClientUser.fetchGuilds({ withCounts }) for refreshing the current user and its guilds',
          'client.requestGuildMembers() gateway helper for requesting member chunks',
          'CHANNEL_RECIPIENT_ADD / CHANNEL_RECIPIENT_REMOVE handlers and matching client events',
          'channels.fetch(id, { force }) and matching force/patch behavior on guilds.fetch',
          'GUILD_COUNTS_UPDATE now updates guild.memberCount and guild.onlineCount live',
          'New WebSocket identify options: flags, ignoredEvents, and initialGuildId',
          'OpenAPI gateway coverage, alignment asserts, and Fluxer compare scripts (pnpm openapi:check / openapi:assert)',
          'New cache-bot example and an expanded caching guide',
        ],
      },
      {
        title: 'Changed',
        items: [
          'Internal package layout was reorganized; public imports stay on package entrypoints (see Breaking Changes)',
          'Managers now run on LimitedCollection with cache limits resolved from your options at construction time',
          {
            summary: 'Unhandled gateway dispatches now emit Events.Debug',
            detail:
              'Dispatches the client does not handle surface as a Debug event so they are visible, except session, user, and call events, which stay intentionally unhandled and quiet.',
          },
          'Voice join and move now send explicit mute/deaf/self_* defaults in the state update',
          'The vendored OpenAPI snapshot was refreshed against live Fluxer and the types package was aligned to it',
          'Gateway guild create/ready snapshot typing uses GatewayGuildSnapshot (nested properties plus top-level count fields)',
        ],
      },
      {
        title: 'Fixed',
        items: [
          {
            summary: 'Guild memberCount / onlineCount hydrate from GUILD_CREATE and COUNTS_UPDATE',
            detail:
              'Fluxer puts member_count / online_count on the guild snapshot root (alongside properties). The client merges those top-level fields, keeps prior counts when a later payload omits them, and applies GUILD_COUNTS_UPDATE live.',
          },
          'Synthetic react() events no longer stuff the full wire string into emoji.name',
          'ReactionCollector no longer double-counts repeated self/gateway events for the same user and emoji',
          'CHANNEL_DELETE now cleans up guild-indexed channels after a global FIFO eviction',
          'Channel-create rate_limit_per_user and NSFW/CWL nullability now match the OpenAPI schema',
          'Multipart / undici form serialization from the earlier 2.x patch line is carried forward in this release',
        ],
      },
      {
        title: 'Migration notes',
        items: [
          'Replace resolveTenorToImageUrl / Tenor imports with resolveKlipyToImageUrl (see /guides/gifs/)',
          'Change cache: { messages: 0 } (used to mean "off") to cache: { messages: false }',
          'Replace deep structure imports with named imports from the root, e.g. import { Guild, MessageReaction } from "@fluxerjs/core"',
          'If you matched reactions on emoji.name === "name:id", switch to emoji.id or emojiIdentifier',
          'If you passed ws intents: N, change it to intents: 0 or drop it (Fluxer ignores intents)',
        ],
      },
    ],
  },
  {
    version: '2.1.0',
    date: '2026-07-30',
    sections: [
      {
        title: 'Changed',
        items: [
          'Require Node.js ≥ 22.13 across all published packages',
          'REST no longer sends the configured token to cross-origin absolute URLs unless auth: true is set explicitly',
          'Automatic retries now apply only to safe methods (GET/HEAD/OPTIONS) by default; opt mutations in per-request via retryPolicy',
          'Client now honors configured cache limits (managers are constructed after resolving DEFAULT_CACHE_LIMITS with your options)',
        ],
      },
      {
        title: 'Fixed',
        items: [
          'Reactions with external custom emojis are now allowed when permitted by Fluxer',
          'Preserve cached reaction users across gateway events',
          'Correct REST rate-limit bucket identification',
          'Clean up timed-out voice connections',
          'Hydrate and harden normalization of nested gateway guild properties',
        ],
      },
    ],
  },
  {
    version: '2.0.3',
    date: '2026-07-17',
    sections: [
      {
        title: 'Fixed',
        items: [
          'ReactionCollector now handles messageReactionAddMany (gateway-batched reactions), not only messageReactionAdd',
        ],
      },
    ],
  },
  {
    version: '2.0.2',
    date: '2026-07-15',
    sections: [
      {
        title: 'Added',
        items: [
          'REST retryPolicy for per-request retry budgets (e.g. keep retries on GET, disable on writes)',
          'Guild.available plus GuildUnavailable / GuildAvailable for temporary gateway outages',
        ],
      },
      {
        title: 'Fixed',
        items: [
          'User.prototype.send argument typing',
          'Temporary guild unavailability no longer emitted as GuildDelete',
        ],
      },
      {
        title: 'Docs',
        items: [
          'Versioned SDK reference and guides for each tagged release (v2.0.0+)',
          'Website improvements',
        ],
      },
    ],
  },
  {
    version: '2.0.1',
    date: '2026-07-13',
    sections: [
      {
        title: 'Changed',
        items: [
          'Raised Node.js engine requirement (Node 20 support removed; requires Node ≥ 22.13)',
          'Updated undici to v7',
        ],
      },
      {
        title: 'Fixed',
        items: [
          'Dependency audit fixes',
          'Publishing and CI improvements, including bot-login checks',
        ],
      },
    ],
  },
  {
    version: '2.0.0',
    date: '2026-07-11',
    sections: [
      {
        title: 'Major rewrite (non-voice)',
        items: [
          'ChannelType.GuildLink is 998; createChannel uses ChannelCreateRequest (link requires url)',
          'EmbedBuilder: removed setVideo/setAudio; request type RESTPostAPIEmbed separate from APIEmbed',
          'Default bounded caches (DEFAULT_CACHE_LIMITS); reply defaults; GUILD_UPDATE preserves caches',
          'Reaction events emit full ClientEvents arity; Collection first/last/random allocation fixes',
          'Interactions / slash commands removed (not in OpenAPI)',
          'See the [Migrating to 2.0](/guides/migration/#migrating-to-20) guide',
        ],
      },
    ],
  },
];
