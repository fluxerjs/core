# Fluxer SDK Examples

Runnable bots for common `@fluxerjs/core` patterns.

## Quickest start

From the repo root after `pnpm install && pnpm run build`:

```bash
FLUXER_BOT_TOKEN=your_token node examples/minimal-bot.js
```

Send `!ping` in a channel the bot can see. Walkthrough: [Basic Bot](https://fluxer.js.org/guides/basic-bot/).

## Setup

```bash
pnpm install
pnpm run build
```

Copy `.env.example` to `.env` if you want, or set env vars inline. Always use `FLUXER_BOT_TOKEN` (not `FLUXER_TOKEN`).

## Examples

| Example | What it shows |
| ------- | ------------- |
| [minimal-bot.js](minimal-bot.js) | Login + `!ping` |
| [first-steps-bot.js](first-steps-bot.js) | `!hello`, `!avatar`, `!embed`, `!perms` (+ `FluxerError`) |
| [ping-bot.js](ping-bot.js) | Prefix map, embeds, DMs, replies, reactions (+ `FluxerError`) |
| [cache-bot.js](cache-bot.js) | Custom limits, `client.cache.stats()`, periodic sweeps |
| [info-bot.js](info-bot.js) | `!userinfo`, `!serverinfo`, `!roleinfo`, `!setnick` |
| [collectors-bot.js](collectors-bot.js) | `!ask`, `!vote` via `awaitMessages` / `awaitReactions` |
| [history-bot.js](history-bot.js) | `!latest`, `!history`, `!search`, `!purge` (`preloadMessages` + fetch) |
| [attachments-bot.js](attachments-bot.js) | `AttachmentBuilder` buffer, spoiler, URL |
| [reaction-bot.js](reaction-bot.js) | Reaction add/remove logging |
| [reaction-roles-bot.js](reaction-roles-bot.js) | `!roles` reaction role picker |
| [webhook-bot.js](webhook-bot.js) | Create / list / send / delete webhooks |
| [moderation-bot.js](moderation-bot.js) | Ban, kick, timeout, unban, `!perms` |
| [voice-bot.js](voice-bot.js) | **Advanced** `!play` / `!stop` (voice being reworked) |
| [multi-instance-bot.js](multi-instance-bot.js) | **Advanced** beta `ClientCluster` |
| [sharded-bot.js](sharded-bot.js) | **Advanced** beta process sharding (`ShardingManager`) |

Docs site mirrors these under `/examples/`. Guides path: install → basic bot → prefix → errors → caching. [Upgrading to 3.0](https://fluxer.js.org/guides/upgrading-to-3/) and [From discord.js](https://fluxer.js.org/guides/from-discordjs/) live outside Getting Started.

## 3.0 habits these use

- `new Client()` with no intents
- Pass `EmbedBuilder` / `AttachmentBuilder` into `reply` / `send` / `edit` (no `.toJSON()` at call sites)
- CamelCase options (`deleteMessageDays`, `customStatus`, `avatarUrl`)
- Reaction events: one payload `{ reaction, user, emoji, userId, messageId, channelId }`
- `parsePrefixCommand` / `parseUserMention`
- `member.roles.add` / `remove` / `has`; `role.has` for role permission checks
- Fetch then `channel.delete()` / `channel.send()`; `message.resolveChannel()` / `message.resolveGuild()`
- Catch `FluxerError` + `ErrorCodes` in command handlers

## Environment

| Variable | Notes |
| -------- | ----- |
| `FLUXER_BOT_TOKEN` | Required for gateway bots |
| `FLUXER_API_URL` | Optional custom API host |
| `SELFHOST_API` / `SELFHOST_BOT_TOKEN` | Multi-instance (distinct tokens) |
| `VOICE_DEBUG` | Voice logs |
| `REACTION_ROLES_*` / `ROLE_*` | Reaction roles example |

Full docs: https://fluxer.js.org
