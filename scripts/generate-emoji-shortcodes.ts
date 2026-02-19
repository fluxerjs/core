#!/usr/bin/env node
/**
 * Generate shortcode→unicode map from Discord's emoji data (anyascii/discord-emojis).
 * Fluxer is Discord-compatible, so we use Discord's official shortcodes.
 * Run: pnpm exec tsx scripts/generate-emoji-shortcodes.ts
 *
 * Source: https://github.com/anyascii/discord-emojis
 * Format: { "emojis": [ { "names": ["arrow_backward"], "surrogates": "⬅️" }, ... ] }
 */
import { writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const cwd = process.cwd();
const repoRoot =
  basename(cwd) === 'util' && basename(dirname(cwd)) === 'packages' ? join(cwd, '../..') : cwd;
const utilPath = join(repoRoot, 'packages/util');

const DISCORD_EMOJIS_URL =
  'https://raw.githubusercontent.com/anyascii/discord-emojis/master/discord-emojis.json';

async function fetchDiscordEmojis(): Promise<{
  emojis: Array<{ names: string[]; surrogates: string }>;
}> {
  const res = await fetch(DISCORD_EMOJIS_URL);
  if (!res.ok) throw new Error(`Failed to fetch discord-emojis: ${res.status}`);
  return res.json();
}

async function main() {
  const data = await fetchDiscordEmojis();
  const map: Record<string, string> = {};

  for (const entry of data.emojis) {
    const { names, surrogates } = entry;
    if (!Array.isArray(names) || !surrogates) continue;
    for (const name of names) {
      const normalized = String(name).replace(/\s+/g, '_').trim().toLowerCase();
      if (normalized.length < 2 || !/^[\w_]+$/.test(normalized)) continue;
      map[normalized] = surrogates;
    }
  }

  const output = `/**
 * Auto-generated from Discord's emoji data (anyascii/discord-emojis).
 * Run: pnpm exec tsx scripts/generate-emoji-shortcodes.ts
 */
export const UNICODE_EMOJI_SHORTCODES: Record<string, string> = ${JSON.stringify(map, null, 0)};
`;

  const outPath = join(utilPath, 'src/emojiShortcodes.generated.ts');
  writeFileSync(outPath, output, 'utf8');
  console.log(`Wrote ${outPath} (${Object.keys(map).length} shortcodes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
