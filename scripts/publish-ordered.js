#!/usr/bin/env node
/**
 * Publish @fluxerjs packages in dependency order with a delay between each
 * to avoid npm 409 (packument not fully processed).
 *
 * Skips packages whose current package.json version is already on npm so
 * partial releases / re-runs do not fail the GitHub Action.
 *
 * Run from repo root:
 *   node scripts/publish-ordered.js
 *   node scripts/publish-ordered.js --delay=15
 *   node scripts/publish-ordered.js --otp=123456
 *   node scripts/publish-ordered.js --dry-run
 *
 * Prereqs: pnpm install, pnpm run build, and npm login (or OIDC trusted publishing).
 */

const { execSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

/** Dependency order: no internal deps first, then dependents */
const PACKAGES = [
  { name: '@fluxerjs/types', dir: 'packages/types' },
  { name: '@fluxerjs/util', dir: 'packages/util' },
  { name: '@fluxerjs/collection', dir: 'packages/collection' },
  { name: '@fluxerjs/rest', dir: 'packages/rest' },
  { name: '@fluxerjs/ws', dir: 'packages/ws' },
  { name: '@fluxerjs/builders', dir: 'packages/builders' },
  { name: '@fluxerjs/core', dir: 'packages/fluxer-core' },
  { name: '@fluxerjs/voice', dir: 'packages/voice' },
  { name: '@fluxerjs/sharding', dir: 'packages/sharding' },
  { name: '@fluxerjs/sharding-redis', dir: 'packages/sharding-redis' },
];

const args = process.argv.slice(2);
const delaySec = Number.parseInt(
  args.find((a) => a.startsWith('--delay='))?.split('=')[1] || '1',
  10,
);
const otp = args.find((a) => a.startsWith('--otp='));
const otpArg = otp ? ` ${otp}` : '';
const dryRun = args.includes('--dry-run');

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', shell: true, cwd: ROOT, ...opts });
}

function readLocalVersion(dir) {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, dir, 'package.json'), 'utf8'));
  return pkg.version;
}

/** Returns true when `name@version` is already on the npm registry. */
function isAlreadyPublished(name, version) {
  const result = spawnSync('npm', ['view', `${name}@${version}`, 'version', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, npm_config_loglevel: 'error' },
  });

  if (result.status !== 0) {
    // 404 / not found → needs publish
    return false;
  }

  try {
    const parsed = JSON.parse(result.stdout.trim() || 'null');
    // npm may return a string or an array when multiple matches exist
    if (typeof parsed === 'string') return parsed === version;
    if (Array.isArray(parsed)) return parsed.includes(version);
    return false;
  } catch {
    return result.stdout.trim() === version;
  }
}

function sleepSync(ms) {
  if (ms <= 0) return;
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    /* busy-wait keeps the script dependency-free */
  }
}

console.log('Resolving local vs published versions…\n');

const toPublish = [];
const skipped = [];

for (const pkg of PACKAGES) {
  const version = readLocalVersion(pkg.dir);
  if (isAlreadyPublished(pkg.name, version)) {
    skipped.push(`${pkg.name}@${version}`);
    console.log(`↷ Skip ${pkg.name}@${version} (already on npm)`);
  } else {
    toPublish.push({ ...pkg, version });
    console.log(`→ Queue ${pkg.name}@${version}`);
  }
}

if (toPublish.length === 0) {
  console.log('\nNothing to publish — all package versions already exist on npm.');
  process.exit(0);
}

if (dryRun) {
  console.log(`\nDry run: would publish ${toPublish.length} package(s):`);
  for (const pkg of toPublish) console.log(`  - ${pkg.name}@${pkg.version}`);
  if (skipped.length > 0) console.log(`Skipped: ${skipped.join(', ')}`);
  process.exit(0);
}

console.log('\nInstalling (ensures workspace links are used)...');
run('pnpm install');
console.log('Building...');
run('pnpm run build');

console.log(
  `\nPublishing ${toPublish.length} package(s) (${skipped.length} skipped) with ${delaySec}s delay.\n`,
);

for (let i = 0; i < toPublish.length; i++) {
  const pkg = toPublish[i];
  console.log(`[${i + 1}/${toPublish.length}] ${pkg.name}@${pkg.version}`);
  try {
    run(`pnpm --filter "${pkg.name}" publish --no-git-checks${otpArg}`);
  } catch {
    console.error(`Publish failed for ${pkg.name}@${pkg.version}`);
    process.exit(1);
  }
  if (i < toPublish.length - 1) {
    console.log(`Waiting ${delaySec}s...\n`);
    sleepSync(delaySec * 1000);
  }
}

console.log('\nAll queued packages published.');
if (skipped.length > 0) {
  console.log(`Skipped (already published): ${skipped.join(', ')}`);
}
