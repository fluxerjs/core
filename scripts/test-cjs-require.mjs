#!/usr/bin/env node
/**
 * Test that all published @fluxerjs packages can be required as CJS without throwing.
 * Catches issues when packages fail to load via require().
 *
 * Run from repo root after build:
 *   node scripts/test-cjs-require.mjs
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const PACKAGES = [
  '@fluxerjs/types',
  '@fluxerjs/types/routes',
  '@fluxerjs/util',
  '@fluxerjs/collection',
  '@fluxerjs/rest',
  '@fluxerjs/rest/request-manager',
  '@fluxerjs/ws',
  '@fluxerjs/builders',
  '@fluxerjs/core',
  '@fluxerjs/core/client',
  '@fluxerjs/core/errors',
  '@fluxerjs/core/message',
  '@fluxerjs/core/cluster',
  '@fluxerjs/voice',
  '@fluxerjs/sharding',
  '@fluxerjs/sharding-redis',
];

function main() {
  const failed = [];
  for (const pkg of PACKAGES) {
    try {
      require(pkg);
      console.log(`✓ ${pkg}`);
    } catch (err) {
      console.error(`✗ ${pkg}:`, err.message);
      failed.push({ pkg, err });
    }
  }
  if (failed.length > 0) {
    console.error('\nCJS require test failed for:', failed.map((f) => f.pkg).join(', '));
    process.exit(1);
  }
  console.log(`\nAll ${PACKAGES.length} packages load as CJS successfully.`);
}

main();
