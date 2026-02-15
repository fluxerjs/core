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
