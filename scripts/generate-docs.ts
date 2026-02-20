#!/usr/bin/env node
/**
 * Generate combined API documentation JSON from all SDK packages.
 * Output: apps/docs/public/docs/main.json (single file)
 */

import { resolve, dirname } from 'path';
import { mkdirSync, writeFileSync, readFileSync, unlinkSync, readdirSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { generateDocs } from '@fluxerjs/docgen';
import { DocOutput } from '@fluxerjs/docgen';
import { guides } from '../apps/docs/src/data/guides';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const PACKAGES: { id: string; name: string; pkgPath: string }[] = [
  { id: 'core', name: '@fluxerjs/core', pkgPath: 'packages/fluxer-core' },
  { id: 'builders', name: '@fluxerjs/builders', pkgPath: 'packages/builders' },
  { id: 'rest', name: '@fluxerjs/rest', pkgPath: 'packages/rest' },
  { id: 'ws', name: '@fluxerjs/ws', pkgPath: 'packages/ws' },
  { id: 'voice', name: '@fluxerjs/voice', pkgPath: 'packages/voice' },
  { id: 'util', name: '@fluxerjs/util', pkgPath: 'packages/util' },
  { id: 'collection', name: '@fluxerjs/collection', pkgPath: 'packages/collection' },
  { id: 'types', name: '@fluxerjs/types', pkgPath: 'packages/types' },
];

const DOCS_DIR = resolve(root, 'apps/docs/public/docs');

function getVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
    return pkg.version ?? '1.1.0';
  } catch {
    return '1.1.0';
  }
}

async function main(): Promise<void> {
  const allClasses: DocOutput['classes'] = [];
  const allInterfaces: DocOutput['interfaces'] = [];
  const allEnums: DocOutput['enums'] = [];
  const packages = new Set<string>();

  const seen = new Set<string>();

  for (const pkg of PACKAGES) {
    try {
      const pkgRoot = resolve(root, pkg.pkgPath);
      const tsconfigPath = resolve(pkgRoot, 'tsconfig.json');
      const outDir = resolve(root, 'apps/docs/public/docs');
      const tempFile = resolve(outDir, `_temp_${pkg.id}.json`);

      generateDocs({
        entryPoints: ['src/index.ts'],
        tsconfigPath,
        packageName: pkg.name,
        outFile: tempFile,
        repoRoot: root,
      });

      const data = JSON.parse(readFileSync(tempFile, 'utf-8')) as DocOutput;
      unlinkSync(tempFile);

      for (const c of data.classes ?? []) {
        if (!seen.has(`class:${c.name}`)) {
          seen.add(`class:${c.name}`);
          allClasses.push({ ...c, package: pkg.name });
          packages.add(pkg.name);
        }
      }
      for (const i of data.interfaces ?? []) {
        if (!seen.has(`interface:${i.name}`)) {
          seen.add(`interface:${i.name}`);
          allInterfaces.push({ ...i, package: pkg.name });
          packages.add(pkg.name);
        }
      }
      for (const e of data.enums ?? []) {
        if (!seen.has(`enum:${e.name}`)) {
          seen.add(`enum:${e.name}`);
          allEnums.push({ ...e, package: pkg.name });
          packages.add(pkg.name);
        }
      }
      console.log(`[generate-docs] ${pkg.name}`);
    } catch (err) {
      console.error(`[generate-docs] Failed for ${pkg.name}:`, err);
      throw err;
    }
  }

  allClasses.sort((a, b) => a.name.localeCompare(b.name));
  allInterfaces.sort((a, b) => a.name.localeCompare(b.name));
  allEnums.sort((a, b) => a.name.localeCompare(b.name));

  const version = getVersion();
  const combined: DocOutput = {
    meta: { generator: 'fluxer-docgen', version: '1', date: Date.now() },
    package: '@fluxerjs/core',
    version,
    packages: Array.from(packages).sort(),
    classes: allClasses,
    interfaces: allInterfaces,
    enums: allEnums,
  };

  const jsonStr = JSON.stringify(combined, null, 2);

  // Write to versioned path: docs/v1.0.6/main.json (separate file per version)
  const versionedDir = resolve(DOCS_DIR, `v${version}`);
  mkdirSync(versionedDir, { recursive: true });
  const versionedFile = resolve(versionedDir, 'main.json');
  writeFileSync(versionedFile, jsonStr, 'utf-8');
  console.log(`[generate-docs] Versioned -> ${versionedFile}`);

  // Also write to docs/latest/main.json for the "latest" alias (avoids extra redirect)
  const latestDir = resolve(DOCS_DIR, 'latest');
  mkdirSync(latestDir, { recursive: true });
  writeFileSync(resolve(latestDir, 'main.json'), jsonStr, 'utf-8');
  console.log(`[generate-docs] Latest -> ${latestDir}/main.json`);

  // versions.json — derive from actual v* folders so we never lose older versions
  const versionsPath = resolve(DOCS_DIR, 'versions.json');
  const dirEntries = readdirSync(DOCS_DIR, { withFileTypes: true });
  const versionDirs = dirEntries
    .filter((e) => e.isDirectory() && /^v\d+\.\d+\.\d+$/.test(e.name))
    .map((e) => e.name.slice(1)); // strip leading "v"
  const hasCurrent = versionDirs.includes(version);
  const allVersions = hasCurrent
    ? [...new Set([version, ...versionDirs])]
    : [version, ...versionDirs];
  allVersions.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  const versionsData = { versions: allVersions, latest: version };
  writeFileSync(versionsPath, JSON.stringify(versionsData, null, 2), 'utf-8');
  console.log(`[generate-docs] Versions -> ${versionsPath} (${allVersions.length} versions)`);

  // Guides per version (same content for now; override per version in data/ if needed later)
  const guidesPath = pathToFileURL(resolve(root, 'apps/docs/src/data/guides.ts')).href;
  const guidesStr = JSON.stringify(guides, null, 2);
  writeFileSync(resolve(versionedDir, 'guides.json'), guidesStr, 'utf-8');
  writeFileSync(resolve(latestDir, 'guides.json'), guidesStr, 'utf-8');
  console.log(`[generate-docs] Guides -> docs/v${version}/guides.json, docs/latest/guides.json`);

  console.log('[generate-docs] Done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
