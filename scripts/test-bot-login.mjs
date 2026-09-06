#!/usr/bin/env node
/**
 * Live bot login smoke test against the Fluxer gateway.
 *
 * Requires FLUXER_BOT_TOKEN. Logs in, waits for Ready, then destroys.
 *
 * Usage:
 *   FLUXER_BOT_TOKEN=... node scripts/test-bot-login.mjs
 *   FLUXER_BOT_TOKEN=... pnpm run test:bot
 */

import { Client, Events } from '@fluxerjs/core';

const READY_TIMEOUT_MS = Number(process.env.BOT_LOGIN_TIMEOUT_MS || 45_000);
const token = process.env.FLUXER_BOT_TOKEN?.trim();

if (!token) {
  if (process.env.REQUIRE_BOT_TOKEN === '1') {
    console.error('FLUXER_BOT_TOKEN is required (set the GitHub Actions secret).');
    process.exit(1);
  }
  console.warn('Skipping bot login test: FLUXER_BOT_TOKEN not set');
  process.exit(0);
}

const client = new Client({ intents: 0, shardCount: 1 });
const debugLog = [];
const closeLog = [];

function rememberDebug(msg) {
  debugLog.push(msg);
  if (debugLog.length > 40) debugLog.shift();
}

function fail(err) {
  const message = err instanceof Error ? err.stack || err.message : String(err);
  console.error('Bot login test failed:', message);
  if (closeLog.length) {
    console.error('Shard disconnects:', closeLog.join(', '));
  }
  if (debugLog.length) {
    console.error('Last gateway debug lines:');
    for (const line of debugLog) console.error(`  ${line}`);
  }
  client.destroy().catch(() => {});
  process.exit(1);
}

client.on(Events.Error, (err) => {
  fail(err);
});
client.on(Events.Debug, (msg) => {
  rememberDebug(typeof msg === 'string' ? msg : String(msg));
});
const FATAL_LOGIN_CLOSE = new Set([4003, 4004, 4005, 4010]);

client.on(Events.ShardDisconnect, (shardId, code) => {
  closeLog.push(`shard ${shardId} code ${code}`);
  if (FATAL_LOGIN_CLOSE.has(code)) {
    const name =
      code === 4004
        ? 'AuthenticationFailed'
        : code === 4003
          ? 'NotAuthenticated'
          : code === 4005
            ? 'AlreadyAuthenticated'
            : 'InvalidShard';
    fail(
      new Error(
        `Gateway closed shard ${shardId} with ${code} ${name}. Login cannot succeed. Check FLUXER_BOT_TOKEN.`,
      ),
    );
  }
});
client.on(Events.ShardError, (shardId, err) => {
  rememberDebug(`shard ${shardId} error: ${err instanceof Error ? err.message : String(err)}`);
});

const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => {
    reject(new Error(`Timed out waiting for Ready after ${READY_TIMEOUT_MS}ms`));
  }, READY_TIMEOUT_MS);

  client.once(Events.Ready, () => {
    clearTimeout(timer);
    resolve();
  });
});

try {
  console.log(`Logging in (Node ${process.version})…`);
  await client.login(token);
  await ready;
  const who = client.user?.username ?? client.user?.id ?? 'unknown';
  console.log(`✓ Ready as ${who}`);
  await client.destroy();
  console.log('✓ Bot login smoke test passed');
  process.exit(0);
} catch (err) {
  fail(err);
}
