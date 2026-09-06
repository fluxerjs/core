import { relative } from 'node:path';
import * as ts from 'typescript';
import {
  extractConstructor,
  extractConstFunctionMap,
  extractConstStringEnum,
  extractEnumMember,
  extractGetterProperty,
  extractInterfaceProperty,
  extractMethod,
  extractProperty,
  extractTypeAliasMembers,
  getDeprecatedFromJSDoc,
  getDescriptionFromJSDocComment,
  getExamplesFromJSDoc,
  getSeeFromJSDoc,
  isOverloadImplementation,
} from './Extract.js';
import { isHiddenSymbol } from './Filter.js';
import type { DocClass, DocEnum, DocInterface, DocSource } from './Schema.js';

function getJSDoc(node: ts.Node): string {
  const sourceFile = node.getSourceFile();
  const text = sourceFile.getFullText();
  const commentRanges = ts.getLeadingCommentRanges(text, node.getFullStart());
  if (!commentRanges?.length) return '';
  for (let i = commentRanges.length - 1; i >= 0; i--) {
    const range = commentRanges[i]!;
    const comment = text.slice(range.pos, range.end);
    if (comment.startsWith('/**')) return comment;
  }
  return '';
}

function getSource(node: ts.Node, repoRoot?: string): DocSource {
  const sourceFile = node.getSourceFile();
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  const fileName = sourceFile.fileName.split(/[/\\]/).pop() ?? '';
  const result: DocSource = { file: fileName, line: line + 1 };
  if (repoRoot) {
    const rel = relative(repoRoot, sourceFile.fileName);
    result.path = rel.replace(/\\/g, '/');
  }
  return result;
}

function isPrivateMember(member: ts.ClassElement): boolean {
  if (ts.getCombinedModifierFlags(member) & ts.ModifierFlags.Private) return true;
  return Boolean(member.name && ts.isPrivateIdentifier(member.name));
}

function isExported(node: ts.Node): boolean {
  if (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) return true;
  if (!node.parent || !ts.isSourceFile(node.parent) || !ts.canHaveModifiers(node)) return false;
  return Boolean(ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));
}

export function visitSourceFile(
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  options?: { repoRoot: string },
): { classes: DocClass[]; interfaces: DocInterface[]; enums: DocEnum[] } {
  const classes: DocClass[] = [];
  const interfaces: DocInterface[] = [];
  const enums: DocEnum[] = [];

  function visit(node: ts.Node) {
    if (ts.isClassDeclaration(node)) {
      const name = node.name?.getText();
      const comment = name ? getJSDoc(node) : '';
      if (name && isExported(node) && !isHiddenSymbol(name, comment)) {
        const docClass: DocClass = {
          id: `class:${name}`,
          name,
          kind: 'class',
          description: getDescriptionFromJSDocComment(comment) || undefined,
          extends: node.heritageClauses
            ?.find((c) => c.token === ts.SyntaxKind.ExtendsKeyword)
            ?.types?.[0]?.expression?.getText(),
          constructor: undefined,
          properties: [],
          methods: [],
          source: getSource(node, options?.repoRoot),
          deprecated: getDeprecatedFromJSDoc(comment),
          see: getSeeFromJSDoc(comment),
        };

        for (const member of node.members) {
          if (isPrivateMember(member)) continue;
          if (ts.isConstructorDeclaration(member)) {
            docClass.constructor = extractConstructor(checker, member);
          } else if (ts.isPropertyDeclaration(member)) {
            const prop = extractProperty(checker, member);
            if (prop) docClass.properties.push(prop);
          } else if (ts.isGetAccessor(member)) {
            const prop = extractGetterProperty(checker, member);
            if (prop) docClass.properties.push(prop);
          } else if (ts.isSetAccessor(member)) {
            // Setters are not documented as separate properties
          } else if (ts.isMethodDeclaration(member)) {
            if (isOverloadImplementation(member, node.members)) continue;
            const method = extractMethod(checker, member);
            if (method) docClass.methods.push(method);
          }
        }

        docClass.properties.sort((a, b) => a.name.localeCompare(b.name));
        docClass.methods.sort((a, b) => a.name.localeCompare(b.name));
        classes.push(docClass);
      }
    } else if (ts.isInterfaceDeclaration(node)) {
      const name = node.name.getText();
      const comment = getJSDoc(node);
      if (isExported(node) && !isHiddenSymbol(name, comment)) {
        const extendsTypes =
          node.heritageClauses
            ?.filter((c) => c.token === ts.SyntaxKind.ExtendsKeyword)
            .flatMap((c) => c.types.map((t) => t.expression.getText())) ?? [];
        const docInterface: DocInterface = {
          id: `interface:${name}`,
          name,
          kind: 'interface',
          description: getDescriptionFromJSDocComment(comment) || undefined,
          properties: [],
          methods: [],
          extends: extendsTypes.length ? extendsTypes : undefined,
          source: getSource(node, options?.repoRoot),
          see: getSeeFromJSDoc(comment),
        };

        for (const member of node.members) {
          if (ts.isPropertySignature(member)) {
            const prop = extractInterfaceProperty(checker, member);
            if (prop) docInterface.properties.push(prop);
          } else if (ts.isMethodSignature(member)) {
            const method = extractMethod(checker, member);
            if (method) docInterface.methods!.push(method);
          }
        }

        docInterface.properties.sort((a, b) => a.name.localeCompare(b.name));
        docInterface.methods!.sort((a, b) => a.name.localeCompare(b.name));
        if (!docInterface.methods!.length) delete docInterface.methods;
        interfaces.push(docInterface);
      }
    } else if (ts.isEnumDeclaration(node)) {
      const name = node.name.getText();
      const comment = getJSDoc(node);
      if (isExported(node) && !isHiddenSymbol(name, comment)) {
        const docEnum: DocEnum = {
          id: `enum:${name}`,
          name,
          kind: 'enum',
          description: getDescriptionFromJSDocComment(comment) || undefined,
          members: node.members.map(extractEnumMember),
          source: getSource(node, options?.repoRoot),
          see: getSeeFromJSDoc(comment),
        };
        enums.push(docEnum);
      }
    } else if (ts.isTypeAliasDeclaration(node)) {
      const name = node.name.getText();
      const comment = getJSDoc(node);
      if (isExported(node) && !isHiddenSymbol(name, comment)) {
        const extracted = extractTypeAliasMembers(checker, node);
        const examples = getExamplesFromJSDoc(comment);
        const docInterface: DocInterface = {
          id: `interface:${name}`,
          name,
          kind: 'interface',
          description: getDescriptionFromJSDocComment(comment) || undefined,
          properties: extracted.properties,
          typeSignature: extracted.typeSignature,
          unionMembers: extracted.unionMembers,
          examples: examples.length ? examples : undefined,
          source: getSource(node, options?.repoRoot),
          see: getSeeFromJSDoc(comment),
        };
        interfaces.push(docInterface);
      }
    } else if (
      ts.isVariableStatement(node) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      const comment = getJSDoc(node);
      for (const decl of node.declarationList.declarations) {
        const extracted = extractConstFunctionMap(checker, decl, comment);
        if (extracted && !isHiddenSymbol(extracted.name, comment)) {
          interfaces.push({
            id: `interface:${extracted.name}`,
            name: extracted.name,
            kind: 'interface',
            description: extracted.description,
            properties: extracted.properties,
            examples: extracted.examples,
            source: getSource(decl, options?.repoRoot),
            see: extracted.see,
          });
          continue;
        }
        const strEnum = extractConstStringEnum(decl, comment, getSource(decl, options?.repoRoot));
        if (strEnum && !isHiddenSymbol(strEnum.name, comment)) {
          enums.push(strEnum);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { classes, interfaces, enums };
}
