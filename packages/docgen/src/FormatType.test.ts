import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { formatTypeNode } from './FormatType.js';

const dummyChecker = {} as ts.TypeChecker;

describe('formatTypeNode', () => {
  it('keeps typeof queries instead of expanding them', () => {
    const sf = ts.createSourceFile(
      'fixture.ts',
      'declare const x: typeof Routes;',
      ts.ScriptTarget.Latest,
      true,
    );
    let found: ts.TypeQueryNode | undefined;
    const visit = (n: ts.Node): void => {
      if (!found && ts.isTypeQueryNode(n)) found = n;
      ts.forEachChild(n, visit);
    };
    visit(sf);
    expect(found).toBeDefined();
    expect(formatTypeNode(dummyChecker, found)).toBe('typeof Routes');
  });
});
