/**
 * Shared helpers for public API surface snapshot + check.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const baselineDir = path.join(root, 'test-fixtures', 'api-baseline');

export const PACKAGES: Array<{
  name: string;
  dir: string;
  entries: Array<{ subpath: string; file: string }>;
}> = [
  {
    name: '@fluxerjs/types',
    dir: 'packages/types',
    entries: [
      { subpath: '.', file: 'src/index.ts' },
      { subpath: './routes', file: 'src/SubpathRoutes.ts' },
    ],
  },
  {
    name: '@fluxerjs/util',
    dir: 'packages/util',
    entries: [{ subpath: '.', file: 'src/index.ts' }],
  },
  {
    name: '@fluxerjs/collection',
    dir: 'packages/collection',
    entries: [{ subpath: '.', file: 'src/index.ts' }],
  },
  {
    name: '@fluxerjs/rest',
    dir: 'packages/rest',
    entries: [
      { subpath: '.', file: 'src/index.ts' },
      { subpath: './request-manager', file: 'src/SubpathRequestManager.ts' },
    ],
  },
  {
    name: '@fluxerjs/ws',
    dir: 'packages/ws',
    entries: [{ subpath: '.', file: 'src/index.ts' }],
  },
  {
    name: '@fluxerjs/builders',
    dir: 'packages/builders',
    entries: [{ subpath: '.', file: 'src/index.ts' }],
  },
  {
    name: '@fluxerjs/core',
    dir: 'packages/fluxer-core',
    entries: [
      { subpath: '.', file: 'src/index.ts' },
      { subpath: './client', file: 'src/SubpathClient.ts' },
      { subpath: './errors', file: 'src/SubpathErrors.ts' },
      { subpath: './message', file: 'src/SubpathMessage.ts' },
      { subpath: './internal', file: 'src/SubpathInternal.ts' },
    ],
  },
  {
    name: '@fluxerjs/sharding',
    dir: 'packages/sharding',
    entries: [{ subpath: '.', file: 'src/index.ts' }],
  },
  {
    name: '@fluxerjs/sharding-redis',
    dir: 'packages/sharding-redis',
    entries: [{ subpath: '.', file: 'src/index.ts' }],
  },
];

export type SurfaceEntry = { subpath: string; exports: string[] };
export type SurfaceSnapshot = Record<string, SurfaceEntry[]>;

export function collectExports(filePath: string): string[] {
  const text = fs.readFileSync(filePath, 'utf8');
  const sf = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true);
  const names = new Set<string>();

  for (const stmt of sf.statements) {
    if (ts.isExportDeclaration(stmt)) {
      if (stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
        for (const el of stmt.exportClause.elements) {
          names.add(el.name.text);
        }
      }
    } else if (ts.isExportAssignment(stmt)) {
      names.add('default');
    } else {
      const mods = ts.canHaveModifiers(stmt) ? ts.getModifiers(stmt) : undefined;
      const isExport = mods?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      if (!isExport) continue;
      if (
        ts.isClassDeclaration(stmt) ||
        ts.isFunctionDeclaration(stmt) ||
        ts.isInterfaceDeclaration(stmt) ||
        ts.isTypeAliasDeclaration(stmt) ||
        ts.isEnumDeclaration(stmt)
      ) {
        if (stmt.name) names.add(stmt.name.text);
      } else if (ts.isVariableStatement(stmt)) {
        for (const d of stmt.declarationList.declarations) {
          if (ts.isIdentifier(d.name)) names.add(d.name.text);
        }
      }
    }
  }
  return [...names].sort();
}

export function packageBaselineFile(packageName: string): string {
  const safe = packageName.replace('@', '').replace('/', '__');
  return path.join(baselineDir, `${safe}.json`);
}

/** Compute current public export surface from source entry files. */
export function computeSnapshot(): SurfaceSnapshot {
  const snapshot: SurfaceSnapshot = {};
  for (const pkg of PACKAGES) {
    const entries: SurfaceEntry[] = [];
    for (const e of pkg.entries) {
      const file = path.join(root, pkg.dir, e.file);
      if (!fs.existsSync(file)) {
        console.warn(`skip missing ${file}`);
        continue;
      }
      entries.push({ subpath: e.subpath, exports: collectExports(file) });
    }
    snapshot[pkg.name] = entries;
  }
  return snapshot;
}

export function writeSnapshot(snapshot: SurfaceSnapshot): void {
  fs.mkdirSync(baselineDir, { recursive: true });
  for (const [name, entries] of Object.entries(snapshot)) {
    fs.writeFileSync(
      packageBaselineFile(name),
      `${JSON.stringify({ package: name, generatedAt: new Date().toISOString(), entries }, null, 2)}\n`,
    );
  }
  fs.writeFileSync(
    path.join(baselineDir, 'index.json'),
    `${JSON.stringify(
      { generatedAt: new Date().toISOString(), packages: Object.keys(snapshot) },
      null,
      2,
    )}\n`,
  );
}
