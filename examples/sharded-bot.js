/**
 * Process-sharded bot (beta): manager + child entry in one file.
 *
 * Usage (from repo root after pnpm install && pnpm run build):
 *   FLUXER_BOT_TOKEN=your_token TOTAL_SHARDS=2 node examples/sharded-bot.js
 *
 * Prefix commands: !shard  !where  !guilds
 * When forked as a child, FLUXER_SHARD_* env vars are set by ShardingManager.
 * The manager also injects FLUXER_TOKEN; prefer FLUXER_BOT_TOKEN in your own scripts.
 */

import { Client, Events, parsePrefixCommand } from '@fluxerjs/core';
import { attachShardClientUtil, BETA_SHARDING_WARNING, ShardingManager } from '@fluxerjs/sharding';
import { fileURLToPath } from 'node:url';

const isChild = typeof process.send === 'function' && Boolean(process.env.FLUXER_SHARD_IDS);

if (!isChild) {
  if (typeof process.emitWarning === 'function') {
    process.emitWarning(BETA_SHARDING_WARNING, {
      type: 'FluxerShardingBeta',
      code: 'FLUXER_SHARDING_BETA',
    });
  }

  const token = process.env.FLUXER_BOT_TOKEN;
  if (!token) {
    console.error('Set FLUXER_BOT_TOKEN');
    process.exit(1);
  }

  const totalShards = Number(process.env.TOTAL_SHARDS ?? '2');
  const manager = new ShardingManager(fileURLToPath(import.meta.url), {
    token,
    totalShards,
    shardsPerProcess: 1,
    spawnDelay: 2_000,
  });

  manager.on('shardCreate', (shard) => console.log(`[manager] spawned process ${shard.id}`));
  manager.on('shardReady', (shard) => console.log(`[manager] ready process ${shard.id}`));
  manager.on('error', (err) => console.error('[manager]', err));

  await manager.spawn();
  console.log(`[manager] running ${manager.shardCount} shards`);
} else {
  const client = new Client({ gatewayDebug: false });
  const shard = attachShardClientUtil(client);

  client.on(Events.Ready, () => {
    console.log(`[shard ${shard.ids.join(',')}] ready as ${client.user?.username}`);
    shard.notifyReady();
  });

  client.on(Events.ShardReady, (id) => console.log(`[shard] gateway ${id} ready`));

  client.on(Events.MessageCreate, async (message) => {
    if (message.author?.bot) return;
    const parsed = parsePrefixCommand(message.content ?? '', '!');
    if (!parsed) return;

    if (parsed.command === 'shard') {
      const guildId = message.guildId;
      const mapped =
        guildId != null ? ` · this guild maps to shard ${shard.shardIdForGuildId(guildId)}` : '';
      await message.reply(
        `This process owns gateway shards [${shard.ids.join(', ')}] of ${shard.count}${mapped}`,
      );
      return;
    }

    if (parsed.command === 'where') {
      const guildId = message.guildId;
      if (!guildId) {
        await message.reply('Use !where in a guild (guild → shard is fixed by formula)');
        return;
      }
      try {
        const expected = shard.shardIdForGuildId(guildId);
        const reports = await shard.broadcastEval(
          (c, id) => {
            const util = c.shard;
            const guilds = c.guilds;
            return {
              processId: util?.id ?? util?.ids?.[0] ?? -1,
              shardIds: util?.ids ?? [],
              hasGuild: Boolean(guilds?.get?.(id)),
            };
          },
          { context: guildId },
        );
        const owners = reports
          .filter((r) => r?.hasGuild)
          .map((r) => `process ${r.processId} shards=[${(r.shardIds ?? []).join(',')}]`);
        await message.reply(
          [
            `Guild ${guildId}`,
            `Formula → shard ${expected} of ${shard.count}  ((id >> 22) % ${shard.count})`,
            `Cached on: ${owners.length ? owners.join('; ') : 'none (not yet on this bot / wrong shard)'}`,
            `Replied from process ${shard.id} shards=[${shard.ids.join(',')}]`,
          ].join('\n'),
        );
      } catch (err) {
        await message.reply(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
      return;
    }

    if (parsed.command === 'guilds') {
      try {
        const sizes = await shard.broadcastEval((c) => {
          const g = c.guilds;
          return Number(g?.size ?? 0);
        });
        const total = sizes.reduce((a, b) => a + Number(b || 0), 0);
        await message.reply(`Guilds across shards: ${total} (${sizes.join(', ')})`);
      } catch (err) {
        await message.reply(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  });

  const token = process.env.FLUXER_BOT_TOKEN;
  if (!token) {
    console.error('Set FLUXER_BOT_TOKEN');
    process.exit(1);
  }
  await client.login(token);
}
