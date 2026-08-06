import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packageRoot = join(root, 'packages');
const require = createRequire(import.meta.url);
const publintCli = join(dirname(require.resolve('publint')), 'cli.js');
const attwCli = join(
  dirname(require.resolve('@arethetypeswrong/cli/package.json')),
  'dist',
  'index.js',
);

function run(cli, args, options = {}) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    stdio: 'inherit',
    ...options,
  });
}

function main() {
  const packages = readdirSync(packageRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const directory = join(packageRoot, entry.name);
      const packageJsonPath = join(directory, 'package.json');
      if (!existsSync(packageJsonPath)) return [];

      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      return packageJson.private === true ? [] : [{ directory, name: packageJson.name }];
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  let failed = false;
  for (const pkg of packages) {
    if (!existsSync(join(pkg.directory, 'dist'))) {
      throw new Error(`${pkg.name} has not been built; run \`pnpm run build\` first`);
    }

    console.log(`\nValidating ${pkg.name}`);
    const publint = run(publintCli, ['--strict', '--level', 'warning', pkg.directory]);
    if (publint.error) throw publint.error;
    if (publint.status !== 0) failed = true;

    const attw = run(attwCli, ['--pack', '--profile', 'node16', '--quiet', pkg.directory]);
    if (attw.error) throw attw.error;
    if (attw.status !== 0) {
      failed = true;
      run(attwCli, [
        '--pack',
        '--profile',
        'node16',
        '--format',
        'ascii',
        '--no-color',
        '--no-emoji',
        pkg.directory,
      ]);
    }
  }

  if (failed) return 1;
  console.log(`\nValidated ${packages.length} packed packages`);
  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
