export interface ChangelogSection {
  title: string;
  items: string[];
}

export interface ChangelogEntry {
  version: string;
  date: string;
  sections: ChangelogSection[];
}

export const changelogEntries: ChangelogEntry[] = [
  {
    version: '1.1.2',
    date: '2026-02-18',
    sections: [
      {
        title: 'Guild members',
        items: [
          'guild.members.me — Discord.js parity: returns the current bot user as a GuildMember in that guild, or null if not cached',
          'guild.members.fetchMe() — fetch and cache the bot\'s member when not in cache',
          'GuildMemberManager — guild.members extends Collection with me getter and fetchMe()',
        ],
      },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-02-16',
    sections: [
      {
        title: 'BREAKING: Reaction events',
        items: [
          'MessageReactionAdd and MessageReactionRemove now emit (reaction, user, messageId, channelId, emoji, userId). Migrate from (reaction, user) or raw data destructuring.',
          'Handlers expecting message_id, channel_id, user_id from raw data will break. Use reaction.messageId, reaction.channelId, user.id or the new convenience args.',
        ],
      },
      {
        title: 'New: client.events API',
        items: [
          'client.events — typed shorthand for event handlers. client.events.MessageReactionAdd((reaction, user, messageId, channelId, emoji, userId) => {...}).',
        ],
      },
      {
        title: 'Typing',
        items: [
          'MessageSendOptions — shared type for Channel.send, User.send, DMChannel.send, Message.send, Message.reply; embeds accept (APIEmbed | EmbedBuilder)[]',
          'Webhook.send — embeds typed as (APIEmbed | EmbedBuilder)[]; optional wait param returns Message when true',
          'ClientEvents — GuildEmojisUpdate, GuildStickersUpdate, and other events now use typed dispatch data',
          'Gateway dispatch types — GatewayGuildEmojisUpdateDispatchData, GatewayChannelPinsUpdateDispatchData, etc. exported from @fluxerjs/types',
          'APIApplicationCommandInteraction — member and user fields typed as APIGuildMember and APIUser',
          'APIGuildAuditLogEntry changes — old_value/new_value typed; fetchPinnedMessages pinned items typed',
        ],
      },
      {
        title: 'Webhook & message attachments',
        items: [
          'Webhook.send() — files and attachments support; multipart/form-data when files provided',
          'Channel.send, Message.reply, Message.send, Message.sendTo, client.channels.send — files and attachments support',
          'MessageSendOptions and WebhookSendOptions — files (Blob/ArrayBuffer/Uint8Array) and attachments metadata',
          'REST RequestManager — builds FormData from body + files when files present',
          'EmbedBuilder — JSDoc: embeds can use description-only (no title required)',
        ],
      },
      {
        title: 'Media & embeds',
        items: [
          '@fluxerjs/util — resolveTenorToImageUrl() — resolve Tenor view URLs to GIF URLs for embed images; returns { url, flags: IS_ANIMATED }; derives GIF from JSON-LD or oEmbed (embeds require GIF, not MP4)',
          'EmbedBuilder — setImage/setThumbnail accept EmbedMediaOptions with flags (e.g. EmbedMediaFlags.IS_ANIMATED)',
        ],
      },
      {
        title: 'Profile URLs (avatars, banners)',
        items: [
          'User — avatarURL(), displayAvatarURL(), bannerURL(); auto-detects animated avatars (a_ → gif); optional banner from profile/member context',
          'GuildMember — avatarURL(), displayAvatarURL(), bannerURL() for guild-specific avatars/banners',
          'Webhook — avatarURL()',
          'CDN helpers — cdnAvatarURL(), cdnDisplayAvatarURL(), cdnBannerURL(), cdnMemberAvatarURL(), cdnMemberBannerURL(), cdnDefaultAvatarURL() for raw API data',
          'New guide: Profile URLs — User/Webhook/GuildMember methods and standalone CDN helpers',
        ],
      },
      {
        title: 'Deprecation warnings',
        items: [
          'Runtime deprecation warnings — deprecated APIs (e.g. ChannelManager.fetchMessage, Channel.fetchMessage, Client.fetchMessage) now emit a one-time console.warn when used',
          'emitDeprecationWarning(symbol, message) — exported from @fluxerjs/util for SDK use',
          'FLUXER_SUPPRESS_DEPRECATION=1 — set to silence all deprecation warnings',
        ],
      },
      {
        title: 'Permissions & guild owner',
        items: [
          'Guild owner override — server owner now receives all permissions in member.permissions and member.permissionsIn(channel)',
          'GuildMember.permissions — guild-level permissions (roles only); GuildMember.permissionsIn(channel) — channel-specific permissions (includes overwrites)',
          'Fluxer gateway compatibility — READY, GUILD_CREATE, GUILD_UPDATE now correctly parse GuildReadyData (properties.owner_id) so owner_id is available for permission checks',
          'Guild constructor — supports both owner_id and ownerId; defensive fallback when missing',
          'New guide: Permissions & Moderation — member.permissions, PermissionFlags, owner override, ban/kick examples',
        ],
      },
      {
        title: 'SDK missing properties',
        items: [
          'Channel — icon, lastPinTimestamp on base; permissionOverwrites on GuildChannel',
          'DMChannel — ownerId, recipients (User[]), nicks (Group DM support)',
          'Guild — splash, splashURL(), vanityURLCode, features, verificationLevel, defaultMessageNotifications, explicitContentFilter, afkChannelId, afkTimeout, systemChannelId, rulesChannelId, nsfwLevel, mfaLevel, bannerWidth/Height, splashWidth/Height',
          'User — avatarColor, flags, system',
          'Message — webhookId, mentions (User[]), mentionRoles, nonce',
          'Role — hoistPosition',
          'Webhook — user (creator)',
        ],
      },
      {
        title: 'Fluxer API alignment (bot features)',
        items: [
          'BREAKING: Guild.ban() — now uses delete_message_days (0–7) instead of delete_message_seconds; added ban_duration_seconds for temporary bans',
          'Routes — currentUserGuilds(), leaveGuild(guildId)',
          'ClientUser — fetchGuilds(), leaveGuild(guildId)',
          'GuildChannel — createInvite(options?), fetchInvites()',
          'Channel — bulkDeleteMessages(ids), sendTyping()',
          'Guild — createChannel(data), fetchChannels(), setChannelPositions(updates)',
          'Message — fetchReactionUsers(emoji, options?)',
          'GuildBan and APIBan — expires_at for temporary bans',
        ],
      },
      {
        title: 'Docs',
        items: [
          'New guide: Webhook Attachments & Embeds — description-only embeds, file attachments, full examples',
          'New guides (Media category): Embed Media — images, thumbnails, video, audio; GIFs (Tenor) — send URL as content for gifv, resolveTenorToImageUrl() for Tenor in embeds; File Attachments — files with metadata and flags (spoiler, animated, explicit)',
          'Embeds guide expanded — full EmbedBuilder reference: title, description, URL, color, author, footer, timestamp, fields, image, thumbnail, video, audio, multiple embeds, EmbedBuilder.from(), limits',
          'Docgen — getters (channel, guild, displayName) now appear in API docs',
          'Docgen — AttachmentBuilder.setSpoiler param type fixed; Base class and Client properties documented',
        ],
      },
    ],
  },
  {
    version: '1.0.9',
    date: '2026-02-15',
    sections: [
      {
        title: 'OpenAPI gap fixes',
        items: [
          'Fixed pin/unpin route path — channelPinMessage() uses /channels/{id}/pins/{messageId} (was /messages/pins/...)',
          'Message.pin() and Message.unpin() — pin or unpin a message',
          'TextChannel.fetchPinnedMessages() and DMChannel.fetchPinnedMessages() — fetch pinned messages',
          'Webhook.edit(options) — edit webhook name, avatar, and (with bot auth) channel_id; APIWebhookUpdateRequest and APIWebhookTokenUpdateRequest types',
          'Guild.fetchAuditLogs(options?) — fetch guild audit logs with limit, before, after, userId, actionType filters',
        ],
      },
      {
        title: 'Invite metadata',
        items: ['APIInvite and Invite class — temporary, createdAt, uses, maxUses, maxAge'],
      },
      {
        title: 'Audit log types',
        items: ['APIGuildAuditLog and APIGuildAuditLogEntry — types for guild audit log responses'],
      },
      {
        title: 'Docs',
        items: ['Webhooks guide — Editing a Webhook section with token vs bot auth examples'],
      },
    ],
  },
  {
    version: '1.0.8',
    date: '2026-02-15',
    sections: [
      {
        title: 'Discord.js portability',
        items: [
          'Message.channel and Message.guild — getters that resolve from cache',
          'MessageReaction — reaction events emit (reaction, user); use reaction.emoji, reaction.fetchMessage()',
          'MessageManager — channel.messages.fetch(messageId) for Discord.js-style message access; client.fetchMessage and channel.fetchMessage deprecated',
          'Role and guild.roles — Role class; guild.roles Collection',
          'PartialMessage — MessageDelete emits { id, channelId, channel? }',
          'client.guilds.fetch(guildId) — fetch guilds by ID',
          'client.channels.cache and client.guilds.cache — Discord.js compatibility alias',
        ],
      },
      {
        title: 'Role management',
        items: [
          'Guild.addRoleToMember(userId, roleId) — assign a role by user ID and role ID without fetching the member',
          'Guild.removeRoleFromMember(userId, roleId) — remove a role by user ID and role ID',
          'Guild.resolveRoleId(arg) — resolve role mention (@role), raw snowflake ID, or role name to role ID (fetches guild roles when needed)',
          'parseRoleMention(arg) in @fluxerjs/util — extract role ID from <@&id> format',
        ],
      },
      {
        title: 'Custom emoji resolution',
        items: [
          'Message.react(), removeReaction(), removeReactionEmoji() now accept :name:, name:id, <:name:id>, and unicode — custom emojis resolve via guild emoji lookup when message has guild context',
          'Client.resolveEmoji(emoji, guildId?) — resolve any emoji input to API format for reactions; fetches guild emojis when id is missing',
          'Extended parseEmoji() — supports :name: (colons), name:id (API format), and <a?:name:id> (mention)',
        ],
      },
      {
        title: 'Gateway event handlers',
        items: [
          'New handlers: MessageDeleteBulk, GuildBanAdd, GuildBanRemove, GuildEmojisUpdate, GuildStickersUpdate, GuildIntegrationsUpdate',
          'GuildRoleCreate, GuildRoleUpdate, GuildRoleDelete',
          'GuildScheduledEventCreate, GuildScheduledEventUpdate, GuildScheduledEventDelete',
          'ChannelPinsUpdate, InviteCreate, InviteDelete',
          'TypingStart, UserUpdate, PresenceUpdate, WebhooksUpdate, Resumed',
          'USER_UPDATE patches client.user when the bot updates',
        ],
      },
      {
        title: 'Architecture',
        items: [
          'Event handler registry pattern — handleDispatch uses a Map of handlers instead of a switch; add handlers via eventHandlers.set()',
          'User caching with getOrCreateUser — Message and GuildMember use client.getOrCreateUser(); User._patch() updates cached users',
        ],
      },
      {
        title: 'REST package',
        items: [
          'Fixed timeout leak — clearTimeout moved to finally block in RequestManager',
          'Fixed rate limit race — proper mutex handling',
          'Error chaining with { cause } on retries',
          'NaN handling in RateLimitManager for malformed Retry-After headers',
        ],
      },
      {
        title: 'WebSocket package',
        items: [
          'Fixed double-reconnect race — scheduleReconnect guarded with reconnectTimeout check',
          'Explicit reconnect on heartbeat ack timeout',
          'try/catch around shard.connect() in WebSocketManager',
          'Unhandled promise catch for connect',
        ],
      },
      {
        title: 'Voice package',
        items: [
          'Null guards for client.user before use',
          'Buffer bounds check in VoiceConnection setupUDP (msg.length < 70)',
          'currentStream cleanup in VoiceConnection.destroy()',
          'Video cleanup race guard in LiveKitRtcConnection',
          'MP4 track validation (info.tracks) in LiveKitRtcConnection',
        ],
      },
      {
        title: 'Core package',
        items: [
          'Double-login guard — throws FluxerError if already logged in',
          'Unhandled dispatch promise — .catch() on handleDispatch so rejections emit as errors',
        ],
      },
      {
        title: 'Builders & util',
        items: [
          'EmbedBuilder.setURL() — URL validation with URL.canParse()',
          'AttachmentBuilder — filename validation in constructor and setName()',
          'parseEmoji() — null/undefined/empty checks',
          'SnowflakeUtil.deconstruct — try/catch for BigInt with descriptive error',
          'BitField — JSDoc for 32-bit limitation',
        ],
      },
      {
        title: 'Docs site',
        items: [
          '404 page and catch-all route for invalid URLs',
          'Skip link, SearchModal aria-label and focus trap for accessibility',
          'Changelog section anchors and copy-link buttons',
          'Breadcrumbs on guide pages',
          'On this page TOC on class docs (right sidebar)',
          'Guides grouped by category on index',
          'Minimal bot example and quick-start in examples README',
          'robots.txt, sitemap.xml, SEO meta tags',
        ],
      },
      {
        title: 'Infrastructure & tooling',
        items: [
          'ESLint 9 flat config, Prettier, .editorconfig',
          'Vitest with coverage — tests for collection and util',
          'GitHub Actions: ci.yml, publish.yml, docs-deploy.yml, codeql.yml, dependabot.yml',
          'Husky + lint-staged pre-commit hooks',
          'Changesets for versioning; docs changelog in changelog.ts',
          'Package metadata: repository, bugs, homepage, keywords, license on all packages',
          'GitHub templates: bug_report, feature_request, PULL_REQUEST_TEMPLATE, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT',
        ],
      },
    ],
  },
];
