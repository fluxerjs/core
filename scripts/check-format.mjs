import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const biome = require.resolve('@biomejs/biome/bin/biome');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    ...options,
  });

  if (result.error) throw result.error;
  return result;
}

function normalizeLineEndings(contents) {
  return contents.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
}

function main() {
  const tempRoot = mkdtempSync(join(tmpdir(), 'fluxer-format-'));

  try {
    const filesResult = run('git', [
      'ls-files',
      '--cached',
      '--others',
      '--exclude-standard',
      '-z',
    ]);
    if (filesResult.status !== 0) {
      process.stderr.write(filesResult.stderr);
      return filesResult.status ?? 1;
    }

    const files = filesResult.stdout
      .split('\0')
      .filter(Boolean)
      .filter((file) => existsSync(join(root, file)));
    for (const file of files) {
      cpSync(join(root, file), join(tempRoot, file), {
        recursive: true,
        preserveTimestamps: true,
      });
    }

    const formatResult = run(
      process.execPath,
      [biome, 'format', '--write', '.', '--vcs-enabled=false'],
      { cwd: tempRoot },
    );
    if (formatResult.status !== 0) {
      process.stdout.write(formatResult.stdout);
      process.stderr.write(formatResult.stderr);
      return formatResult.status ?? 1;
    }

    const unformatted = files.filter((file) => {
      const actual = readFileSync(join(root, file));
      const formatted = readFileSync(join(tempRoot, file));
      if (actual.equals(formatted)) return false;

      return (
        normalizeLineEndings(actual.toString('utf8')) !==
        normalizeLineEndings(formatted.toString('utf8'))
      );
    });

    if (unformatted.length > 0) {
      process.stderr.write('The following files are not formatted:\n');
      process.stderr.write(`${unformatted.map((file) => `  ${file}`).join('\n')}\n`);
      process.stderr.write('Run `pnpm run format` to fix them.\n');
      return 1;
    }

    process.stdout.write(`Checked ${files.length} files. No formatting differences found.\n`);
    return 0;
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

process.exitCode = main();
