/**
 * Write public/search.json once so the static export does not inline the
 * search catalog into every HTML page (that blew Vercel disk).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { chdir } from 'node:process';
import { fileURLToPath } from 'node:url';

const docsRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
chdir(docsRoot);

const { buildSearchIndex } = await import('../lib/search-index.ts');
const items = buildSearchIndex();
const outFile = join(docsRoot, 'public', 'search.json');
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(items));
console.log(`[docs] wrote ${outFile} (${items.length} items)`);
