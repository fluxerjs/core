import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const generatedPaths = [
  'packages/types/src/_generated',
  'vendor/openapi/coverage-report.json',
  'vendor/openapi/gateway-coverage-report.json',
];

function runGit(args) {
  const result = spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  return result.stdout.trimEnd();
}

const trackedChanges = runGit(['diff', '--name-status', 'HEAD', '--', ...generatedPaths]);
const untrackedFiles = runGit([
  'ls-files',
  '--others',
  '--exclude-standard',
  '--',
  ...generatedPaths,
]);
const changes = [
  trackedChanges,
  ...untrackedFiles
    .split('\n')
    .filter(Boolean)
    .map((path) => `??\t${path}`),
]
  .filter(Boolean)
  .join('\n');

if (changes) {
  process.stderr.write(`Generated files are not up to date:\n${changes}\n`);
  process.exit(1);
}

process.stdout.write('Generated files are up to date.\n');
