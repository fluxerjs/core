#!/usr/bin/env node
/**
 * Publish @fluxerjs packages in dependency order with a delay between each
 * to avoid npm 409 (packument not fully processed).
 *
 * Run from repo root:
 *   node scripts/publish-ordered.js
 *   node scripts/publish-ordered.js --delay=15
 *   node scripts/publish-ordered.js --otp=123456
 *
 * Prereqs: pnpm install, pnpm run build, and npm login (or token).
 */

const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Dependency order: no internal deps first, then dependents
const PACKAGES = [
  '@fluxerjs/types',
  '@fluxerjs/util',
  '@fluxerjs/collection',
  '@fluxerjs/rest',
  '@fluxerjs/ws',
  '@fluxerjs/builders',
  '@fluxerjs/core',
  '@fluxerjs/voice',
];

const args = process.argv.slice(2);
const delaySec = parseInt(args.find((a) => a.startsWith('--delay='))?.split('=')[1] || '1', 1);
const otp = args.find((a) => a.startsWith('--otp='));
const otpArg = otp ? ` ${otp}` : '';

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', shell: true, cwd: ROOT, ...opts });
}

console.log('Installing (ensures workspace links are used)...');
run('pnpm install');
console.log('Building...');
run('pnpm run build');

console.log(`\nPublishing in order with ${delaySec}s delay between each.\n`);

for (let i = 0; i < PACKAGES.length; i++) {
  const pkg = PACKAGES[i];
  console.log(`[${i + 1}/${PACKAGES.length}] ${pkg}`);
  try {
    run(`pnpm --filter "${pkg}" publish --no-git-checks${otpArg}`);
  } catch (e) {
    console.error(`Publish failed for ${pkg}`);
    process.exit(1);
  }
  if (i < PACKAGES.length - 1) {
    console.log(`Waiting ${delaySec}s...\n`);
    const deadline = Date.now() + delaySec * 1000;
    while (Date.now() < deadline) {}
  }
}

console.log('\nAll packages published.');
