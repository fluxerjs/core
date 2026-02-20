#!/usr/bin/env node
/**
 * Custom doc generator using TypeScript Compiler API.
 * Outputs clean JSON schema for the docs website.
 */

import * as ts from 'typescript';
import { resolve, dirname } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { DocOutput } from './schema.js';

export type { DocOutput, DocClass, DocInterface, DocEnum } from './schema.js';
import { visitSourceFile } from './visitor.js';

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
    if (!filePath.includes(rootPath)) continue;

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

  const output: DocOutput = {
    meta: {
      generator: 'fluxer-docgen',
      version: '1',
      date: Date.now(),
    },
    package: packageName,
    classes: allClasses,
    interfaces: allInterfaces,
    enums: allEnums,
  };

  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf-8');
  return output;
}
