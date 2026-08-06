/**
 * Compare gateway dispatch event coverage: types vs eventHandlers.
 *
 * Usage:
 *   pnpm exec tsx scripts/openapi/gateway-coverage.ts
 *   pnpm exec tsx scripts/openapi/gateway-coverage.ts --strict
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './paths.js';

const strict = process.argv.includes('--strict');
const ROOT = REPO_ROOT;

/** Bot-relevant dispatches that must have handlers (fails --strict if missing). */
const REQUIRED_HANDLERS = new Set([
  'READY',
  'RESUMED',
  'MESSAGE_CREATE',
  'MESSAGE_UPDATE',
  'MESSAGE_DELETE',
  'MESSAGE_DELETE_BULK',
  'MESSAGE_REACTION_ADD',
  'MESSAGE_REACTION_REMOVE',
  'MESSAGE_REACTION_REMOVE_ALL',
  'MESSAGE_REACTION_REMOVE_EMOJI',
  'MESSAGE_REACTION_ADD_MANY',
  'GUILD_CREATE',
  'GUILD_UPDATE',
  'GUILD_DELETE',
  'GUILD_MEMBER_ADD',
  'GUILD_MEMBER_UPDATE',
  'GUILD_MEMBER_REMOVE',
  'GUILD_MEMBERS_CHUNK',
  'GUILD_ROLE_CREATE',
  'GUILD_ROLE_UPDATE',
  'GUILD_ROLE_UPDATE_BULK',
  'GUILD_ROLE_DELETE',
  'GUILD_BAN_ADD',
  'GUILD_BAN_REMOVE',
  'GUILD_EMOJIS_UPDATE',
  'GUILD_STICKERS_UPDATE',
  'GUILD_AUDIT_LOG_ENTRY_CREATE',
  'GUILD_COUNTS_UPDATE',
  'CHANNEL_CREATE',
  'CHANNEL_UPDATE',
  'CHANNEL_UPDATE_BULK',
  'CHANNEL_DELETE',
  'CHANNEL_PINS_UPDATE',
  'CHANNEL_RECIPIENT_ADD',
  'CHANNEL_RECIPIENT_REMOVE',
  'CHANNEL_MEMBER_COUNTS_UPDATE',
  'INVITE_CREATE',
  'INVITE_DELETE',
  'TYPING_START',
  'USER_UPDATE',
  'PRESENCE_UPDATE',
  'PRESENCE_UPDATE_BULK',
  'VOICE_STATE_UPDATE',
  'VOICE_SERVER_UPDATE',
  'VOICE_STATE_ACK',
  'WEBHOOKS_UPDATE',
  'ENTRANCE_SOUND_PLAY',
]);

/** Handled outside eventHandlers (READY in GatewayReady.ts). */
const HANDLED_ELSEWHERE = new Set(['READY']);

function extractDispatchNames(eventsSrc: string): string[] {
  const names: string[] = [];
  for (const m of eventsSrc.matchAll(/:\s*'(READY|[A-Z][A-Z0-9_]+)'/g)) {
    names.push(m[1]!);
  }
  return [...new Set(names)].sort();
}

function extractHandlerKeys(handlersDir: string): Set<string> {
  const keys = new Set<string>();
  const walk = (dir: string): void => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.name.endsWith('.ts') && !ent.name.endsWith('.test.ts')) {
        const src = fs.readFileSync(full, 'utf8');
        for (const m of src.matchAll(/^\s{2}(READY|[A-Z][A-Z0-9_]+)\s*(?:\(|:)/gm)) {
          keys.add(m[1]!);
        }
      }
    }
  };
  walk(handlersDir);
  return keys;
}

function main(): void {
  const eventsPath = path.join(ROOT, 'packages/types/src/Gateway/Events.ts');
  const handlersDir = path.join(ROOT, 'packages/fluxer-core/src/ClientCore/EventHandlers');
  const typed = extractDispatchNames(fs.readFileSync(eventsPath, 'utf8'));
  const handled = extractHandlerKeys(handlersDir);
  for (const e of HANDLED_ELSEWHERE) handled.add(e);

  const unhandled = typed.filter((t) => !handled.has(t));
  const missingRequired = [...REQUIRED_HANDLERS].filter((t) => !handled.has(t)).sort();
  const extraHandlers = [...handled].filter((h) => !typed.includes(h) && h !== 'READY').sort();

  const report = {
    typedCount: typed.length,
    handledCount: handled.size,
    unhandledCount: unhandled.length,
    unhandled,
    missingRequired,
    extraHandlers,
    coveragePct: Math.round(((typed.length - unhandled.length) / typed.length) * 1000) / 10,
  };

  const outDir = path.join(ROOT, 'vendor', 'openapi');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'gateway-coverage-report.json');
  fs.writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(
    `Gateway dispatch coverage: ${report.coveragePct}% (${report.handledCount}/${report.typedCount} handled)`,
  );
  console.log(`Unhandled (${unhandled.length}):`);
  for (const u of unhandled) console.log(`  - ${u}`);
  if (missingRequired.length) {
    console.error(`\nMissing required bot handlers (${missingRequired.length}):`);
    for (const m of missingRequired) console.error(`  - ${m}`);
  }
  console.log(`Wrote ${path.relative(process.cwd(), outFile)}`);

  if (strict && missingRequired.length) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
