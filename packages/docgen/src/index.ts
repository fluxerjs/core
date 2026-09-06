#!/usr/bin/env node

/**
 * Custom doc generator using TypeScript Compiler API.
 * Outputs clean JSON schema for the docs website.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import * as ts from 'typescript';
import type { DocOutput } from './Schema.js';

export type { DocClass, DocEnum, DocInterface, DocOutput } from './Schema.js';
export {
  DISCORD_GHOST_NAMES,
  isGhostSymbol,
  isHiddenMember,
  isHiddenSymbol,
  isWireConverterName,
} from './Filter.js';
export { getExamplesFromJSDoc } from './Extract.js';

import { isGhostSymbol, isHiddenSymbol, isWireConverterName } from './Filter.js';
import { visitSourceFile } from './Visitor.js';

function pruneDocOutput(output: DocOutput): DocOutput {
  return {
    ...output,
    classes: output.classes
      .filter((c) => !isHiddenSymbol(c.name, c.description ?? ''))
      .map((c) => ({
        ...c,
        methods: (c.methods ?? []).filter((m) => !isWireConverterName(m.name)),
        properties: (c.properties ?? []).filter((p) => !isWireConverterName(p.name)),
      })),
    interfaces: output.interfaces.filter((i) => !isGhostSymbol(i.name)),
    enums: output.enums.filter((e) => !isGhostSymbol(e.name)),
  };
}

export interface DocgenOptions {
  entryPoints: string[];
  tsconfigPath: string;
  packageName: string;
  outFile: string;
  /** Repo root for source link paths */
  repoRoot?: string;
}

export function generateDocs(options: DocgenOptions): DocOutput {
  const { entryPoints, tsconfigPath, packageName, outFile, repoRoot } = options;

  const configPath = resolve(tsconfigPath);
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(`Failed to read tsconfig: ${configFile.error.messageText}`);
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    dirname(configPath),
  );

  const rootPath = dirname(configPath);
  const rootPathNorm = rootPath.replace(/\\/g, '/').toLowerCase();
  const program = ts.createProgram(
    parsedConfig.fileNames.length
      ? parsedConfig.fileNames
      : entryPoints.map((e) => resolve(rootPath, e)),
    parsedConfig.options,
  );

  const checker = program.getTypeChecker();
  const allClasses: DocOutput['classes'] = [];
  const allInterfaces: DocOutput['interfaces'] = [];
  const allEnums: DocOutput['enums'] = [];

  const seenClasses = new Set<string>();
  const seenInterfaces = new Set<string>();
  const seenEnums = new Set<string>();

  const visitOptions = repoRoot ? { repoRoot } : undefined;

  for (const sourceFile of program.getSourceFiles()) {
    const filePath = sourceFile.fileName;
    if (filePath.includes('node_modules')) continue;
    const filePathNorm = filePath.replace(/\\/g, '/').toLowerCase();
    if (!filePathNorm.includes(rootPathNorm)) continue;

    const result = visitSourceFile(checker, sourceFile, visitOptions);
    for (const c of result.classes) {
      if (!seenClasses.has(c.name)) {
        seenClasses.add(c.name);
        allClasses.push(c);
      }
    }
    for (const i of result.interfaces) {
      if (!seenInterfaces.has(i.name)) {
        seenInterfaces.add(i.name);
        allInterfaces.push(i);
      }
    }
    for (const e of result.enums) {
      if (!seenEnums.has(e.name)) {
        seenEnums.add(e.name);
        allEnums.push(e);
      }
    }
  }

  allClasses.sort((a, b) => a.name.localeCompare(b.name));
  allInterfaces.sort((a, b) => a.name.localeCompare(b.name));
  allEnums.sort((a, b) => a.name.localeCompare(b.name));

  const output = pruneDocOutput({
    meta: {
      generator: 'fluxer-docgen',
      version: '2',
      date: Date.now(),
    },
    package: packageName,
    classes: allClasses,
    interfaces: allInterfaces,
    enums: allEnums,
  });

  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf-8');
  return output;
}
