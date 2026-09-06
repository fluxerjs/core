#!/usr/bin/env node
/**
 * Extended smoke test: exercises all packages repeatedly and validates core paths.
 * Run after build to stress-test imports and basic functionality.
 *
 * Usage: node scripts/test-smoke.mjs
 */

const iterations = 5;

async function exerciseTypes() {
  const m = await import('@fluxerjs/types');
  const Routes = m.Routes;
  if (!Routes?.channel) throw new Error('Routes.channel missing');
  if (Routes.channel('123') !== '/channels/123') throw new Error('Routes.channel wrong');
  if (Routes.guild('g1') !== '/guilds/g1') throw new Error('Routes.guild wrong');
  if (Routes.gatewayBot() !== '/gateway/bot') throw new Error('Routes.gatewayBot wrong');
}

async function exerciseUtil() {
  const m = await import('@fluxerjs/util');
  if (!m.SnowflakeUtil?.isValid('0')) throw new Error('SnowflakeUtil.isValid failed');
  const id = m.SnowflakeUtil?.snowflakeFromTimestamp?.(Date.now());
  if (typeof id !== 'string') throw new Error('SnowflakeUtil.snowflakeFromTimestamp failed');
  if (m.resolveColor?.(0xff0000) !== 0xff0000) throw new Error('resolveColor failed');
  if (!m.formatColor?.(0xff0000)?.startsWith('#')) throw new Error('formatColor failed');
  const parsed = m.parseEmoji?.('<:custom:123456789012345678>');
  if (parsed?.id !== '123456789012345678') throw new Error('parseEmoji failed');
}

async function exerciseCollection() {
  const m = await import('@fluxerjs/collection');
  const coll = new m.Collection();
  coll.set('a', 1);
  coll.set('b', 2);
  if (coll.get('a') !== 1 || coll.size !== 2) throw new Error('Collection set/get failed');
  if (coll.first() !== 1 || coll.last() !== 2) throw new Error('Collection first/last failed');
  if (coll.reduce((acc, v) => acc + v, 0) !== 3) throw new Error('Collection reduce failed');
}

async function exerciseRest() {
  const m = await import('@fluxerjs/rest');
  const rm = new m.RequestManager({ baseURL: 'https://example.com' });
  if (typeof rm.request !== 'function') throw new Error('RequestManager.request missing');
}

async function exerciseWs() {
  const m = await import('@fluxerjs/ws');
  if (m.GatewayCloseCodes?.Normal !== 1000) throw new Error('GatewayCloseCodes wrong');
}

async function exerciseBuilders() {
  const m = await import('@fluxerjs/builders');
  const embed = new m.EmbedBuilder().setTitle('t').setDescription('d');
  const json = embed.toJSON();
  if (json.title !== 't' || json.description !== 'd') throw new Error('EmbedBuilder failed');
  const att = new m.AttachmentBuilder(new Uint8Array([0]), { name: 'file.png', spoiler: true });
  if (!att.filename.startsWith('SPOILER_')) throw new Error('AttachmentBuilder spoiler failed');
}

async function exerciseCore() {
  const m = await import('@fluxerjs/core');
  if (typeof m.Client !== 'function') throw new Error('Client missing');
  if (!m.Events?.Ready) throw new Error('Events.Ready missing');
}

async function exerciseVoice() {
  const m = await import('@fluxerjs/voice');
  const manager = m.getVoiceManager({ on: () => {} });
  if (!manager || typeof manager.join !== 'function') throw new Error('VoiceManager failed');
}

const suites = [
  exerciseTypes,
  exerciseUtil,
  exerciseCollection,
  exerciseRest,
  exerciseWs,
  exerciseBuilders,
  exerciseCore,
  exerciseVoice,
];

async function main() {
  let totalRuns = 0;
  const start = Date.now();
  for (let i = 0; i < iterations; i++) {
    for (const suite of suites) {
      await suite();
      totalRuns++;
    }
  }
  const elapsed = Date.now() - start;
  console.log(`✓ Smoke test passed: ${totalRuns} suite runs in ${elapsed}ms`);
}

main().catch((err) => {
  console.error('Smoke test failed:', err.message);
  process.exit(1);
});
