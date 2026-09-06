/**
 * Enforce acyclic package dependency layers.
 * types(0), collection(0) → util(1) → rest|ws|builders(2) → core(3) → voice(4)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const LAYER: Record<string, number> = {
  '@fluxerjs/types': 0,
  '@fluxerjs/collection': 0,
  '@fluxerjs/util': 1,
  '@fluxerjs/rest': 2,
  '@fluxerjs/ws': 2,
  '@fluxerjs/builders': 2,
  '@fluxerjs/core': 3,
  '@fluxerjs/sharding': 3,
  '@fluxerjs/voice': 4,
  '@fluxerjs/sharding-redis': 4,
};

const PKG_DIRS: Record<string, string> = {
  '@fluxerjs/types': 'packages/types',
  '@fluxerjs/collection': 'packages/collection',
  '@fluxerjs/util': 'packages/util',
  '@fluxerjs/rest': 'packages/rest',
  '@fluxerjs/ws': 'packages/ws',
  '@fluxerjs/builders': 'packages/builders',
  '@fluxerjs/core': 'packages/fluxer-core',
  '@fluxerjs/sharding': 'packages/sharding',
  '@fluxerjs/voice': 'packages/voice',
  '@fluxerjs/sharding-redis': 'packages/sharding-redis',
};

function main(): void {
  const errors: string[] = [];
  for (const [name, dir] of Object.entries(PKG_DIRS)) {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, dir, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    const myLayer = LAYER[name]!;
    for (const dep of Object.keys(pkg.dependencies ?? {})) {
      if (!(dep in LAYER)) continue;
      const their = LAYER[dep]!;
      if (their > myLayer) {
        errors.push(`${name} (L${myLayer}) must not depend on higher-layer ${dep} (L${their})`);
      }
      if (their === myLayer && dep !== name) {
        errors.push(`${name} must not depend on same-layer peer ${dep}`);
      }
    }
  }
  if (errors.length) {
    console.error('Package boundary violations:');
    for (const e of errors) console.error(' -', e);
    process.exit(1);
  }
  console.log('check-package-boundaries OK');
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
