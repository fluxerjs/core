import doctrine from 'doctrine';
import * as ts from 'typescript';
import { isHiddenMember } from './Filter.js';
import { formatTypeAliasSignature, formatTypeFromType, formatTypeNode } from './FormatType.js';
import type {
  DocConstructor,
  DocEnum,
  DocEnumMember,
  DocInterfaceProperty,
  DocMethod,
  DocParam,
  DocProperty,
  DocSource,
} from './Schema.js';

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

function parseJSDoc(comment: string): doctrine.Annotation | null {
  try {
    return doctrine.parse(comment, { unwrap: true });
  } catch {
    return null;
  }
}

function cleanDescription(s: string): string {
  return s
    .replace(/\r\n/g, '\n')
    .replace(/\s*\/\s*$/, '')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

function getDescriptionFromJSDoc(comment: string): string {
  const parsed = parseJSDoc(comment);
  if (!parsed) return '';
  return cleanDescription(parsed.description ?? '');
}

function tagDescription(tag: { description?: string | null }): string {
  return tag.description ?? '';
}

function getParamDescriptions(comment: string): Map<string, string> {
  const parsed = parseJSDoc(comment);
  const map = new Map<string, string>();
  if (!parsed?.tags) return map;
  for (const tag of parsed.tags) {
    if (tag.title === 'param' && 'name' in tag) {
      const name = String((tag as { name?: string }).name ?? '');
      const desc = tagDescription(tag);
      if (name) map.set(name.replace(/^\[|\]$/g, ''), cleanDescription(desc));
    }
  }
  return map;
}

function _getReturnsFromJSDoc(comment: string): string | undefined {
  const parsed = parseJSDoc(comment);
  if (!parsed?.tags) return undefined;
  const tag = parsed.tags.find((t) => t.title === 'returns' || t.title === 'return');
  if (!tag) return undefined;
  return tagDescription(tag).trim() || undefined;
}

function cleanExample(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/^\s*\*\s?/gm, '')
    .replace(/^```(?:js|javascript|ts|typescript)?\n/i, '')
    .replace(/\n```\s*$/i, '')
    .trim();
}

/** `@example` blocks, including multi-line snippets doctrine may drop. */
export function getExamplesFromJSDoc(comment: string): string[] {
  if (!comment) return [];
  const parsed = parseJSDoc(comment);
  const fromDoctrine =
    parsed?.tags
      ?.filter((t) => t.title === 'example')
      .map((t) => cleanExample(tagDescription(t)))
      .filter(Boolean) ?? [];
  if (fromDoctrine.length) return fromDoctrine;

  const fallback: string[] = [];
  const re = /@example\b[ \t]*\n?([\s\S]*?)(?=\n\s*\*\s*@|\n\s*\*\/|$)/g;
  let match = re.exec(comment);
  while (match !== null) {
    const cleaned = cleanExample(match[1] ?? '');
    if (cleaned) fallback.push(cleaned);
    match = re.exec(comment);
  }
  return fallback;
}

export function getDeprecatedFromJSDoc(comment: string): boolean | string | undefined {
  const parsed = parseJSDoc(comment);
  if (!parsed?.tags) return undefined;
  const tag = parsed.tags.find((t) => t.title === 'deprecated');
  if (!tag) return undefined;
  const desc = tagDescription(tag).trim();
  return desc || true;
}

export function getSeeFromJSDoc(comment: string): string[] | undefined {
  const parsed = parseJSDoc(comment);
  if (!parsed?.tags) return undefined;
  const sees = parsed.tags
    .filter((t) => t.title === 'see')
    .map((t) => tagDescription(t).trim())
    .filter(Boolean);
  return sees.length ? sees : undefined;
}

export function getDescriptionFromJSDocComment(comment: string): string {
  return getDescriptionFromJSDoc(comment);
}

function getSource(node: ts.Node): DocSource | undefined {
  const sourceFile = node.getSourceFile();
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  const fileName = sourceFile.fileName.split(/[/\\]/).pop() ?? '';
  return { file: fileName, line: line + 1 };
}

function isStaticMember(node: ts.Declaration): boolean {
  return !!(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Static);
}

function memberName(node: ts.NamedDeclaration): string | undefined {
  if (!node.name) return undefined;
  return ts.isIdentifier(node.name) ? node.name.text : node.name.getText();
}

/** True for the implementation of a method that also has overload signatures. */
export function isOverloadImplementation(
  member: ts.MethodDeclaration,
  siblings: readonly ts.ClassElement[],
): boolean {
  if (!member.body) return false;
  const name = memberName(member);
  if (!name) return false;
  return siblings.some(
    (sibling) =>
      sibling !== member &&
      ts.isMethodDeclaration(sibling) &&
      !sibling.body &&
      memberName(sibling) === name,
  );
}

export function extractConstructor(
  checker: ts.TypeChecker,
  node: ts.ConstructorDeclaration,
): DocConstructor | undefined {
  const comment = getJSDoc(node);
  const paramDescs = getParamDescriptions(comment);

  const params: DocParam[] = node.parameters.map((p) => {
    const name = (p.name as ts.Identifier).getText();
    const type = p.type
      ? formatTypeNode(checker, p.type)
      : formatTypeFromType(checker, checker.getTypeAtLocation(p));
    const optional = !!p.questionToken;
    const description = paramDescs.get(name);
    return { name, type, optional, description };
  });

  const examples = getExamplesFromJSDoc(comment);

  return {
    params,
    description: getDescriptionFromJSDoc(comment) || undefined,
    examples: examples.length ? examples : undefined,
  };
}

export function extractProperty(
  checker: ts.TypeChecker,
  node: ts.PropertyDeclaration | ts.PropertySignature,
): DocProperty | null {
  const name = (node.name as ts.Identifier)?.getText();
  const comment = getJSDoc(node);
  if (!name || isHiddenMember(name, comment)) return null;

  const type = node.type
    ? formatTypeNode(checker, node.type)
    : formatTypeFromType(checker, checker.getTypeAtLocation(node));
  const readonly = !!(node as ts.PropertyDeclaration).modifiers?.some(
    (m) => m.kind === ts.SyntaxKind.ReadonlyKeyword,
  );
  const optional = !!(node as ts.PropertySignature).questionToken;
  const description = getDescriptionFromJSDoc(comment) || undefined;
  const examples = getExamplesFromJSDoc(comment);

  return {
    name,
    type,
    readonly,
    optional,
    description,
    examples: examples.length ? examples : undefined,
    static: isStaticMember(node) || undefined,
  };
}

export function extractMethod(
  checker: ts.TypeChecker,
  node: ts.MethodDeclaration | ts.MethodSignature,
): DocMethod | null {
  const name = (node.name as ts.Identifier)?.getText();
  const comment = getJSDoc(node);
  if (!name || isHiddenMember(name, comment)) return null;

  const paramDescs = getParamDescriptions(comment);

  const params: DocParam[] = (node.parameters ?? []).map((p) => {
    const pname = (p.name as ts.Identifier).getText();
    const type = p.type
      ? formatTypeNode(checker, p.type)
      : formatTypeFromType(checker, checker.getTypeAtLocation(p));
    const optional = !!p.questionToken;
    const description = paramDescs.get(pname);
    return { name: pname, type, optional, description };
  });

  const returnType = node.type
    ? formatTypeNode(checker, node.type)
    : (node as ts.MethodDeclaration).body
      ? formatTypeFromType(
          checker,
          checker.getReturnTypeOfSignature(checker.getSignatureFromDeclaration(node)!),
        )
      : 'void';

  const async = !!(node as ts.MethodDeclaration).modifiers?.some(
    (m) => m.kind === ts.SyntaxKind.AsyncKeyword,
  );

  const deprecated = getDeprecatedFromJSDoc(comment);
  const examples = getExamplesFromJSDoc(comment);
  const see = getSeeFromJSDoc(comment);

  return {
    name,
    params,
    returns: returnType,
    description: getDescriptionFromJSDoc(comment) || undefined,
    examples: examples.length ? examples : undefined,
    async,
    deprecated,
    source: getSource(node),
    see,
    static: isStaticMember(node) || undefined,
  };
}

export function extractGetterProperty(
  checker: ts.TypeChecker,
  node: ts.GetAccessorDeclaration,
): DocProperty | null {
  const name = (node.name as ts.Identifier)?.getText();
  const comment = getJSDoc(node);
  if (!name || isHiddenMember(name, comment)) return null;

  const returnType = node.type
    ? formatTypeNode(checker, node.type)
    : formatTypeFromType(
        checker,
        checker.getReturnTypeOfSignature(checker.getSignatureFromDeclaration(node)!),
      );
  const description = getDescriptionFromJSDoc(comment) || undefined;
  const examples = getExamplesFromJSDoc(comment);

  return {
    name,
    type: returnType,
    readonly: true,
    optional: false,
    description,
    examples: examples.length ? examples : undefined,
    static: isStaticMember(node) || undefined,
  };
}

export function extractInterfaceProperty(
  checker: ts.TypeChecker,
  node: ts.PropertySignature,
): DocInterfaceProperty | null {
  return extractProperty(checker, node) as DocInterfaceProperty | null;
}

/**
 * Expand `export type Foo = { ... }` into properties; literal unions into unionMembers;
 * otherwise return an expanded typeSignature string.
 */
export function extractTypeAliasMembers(
  checker: ts.TypeChecker,
  node: ts.TypeAliasDeclaration,
): {
  properties: DocInterfaceProperty[];
  typeSignature?: string;
  unionMembers?: DocEnumMember[];
} {
  const typeNode = node.type;
  const typeSignature = formatTypeAliasSignature(checker, node);

  if (ts.isTypeLiteralNode(typeNode)) {
    const properties: DocInterfaceProperty[] = [];
    for (const member of typeNode.members) {
      if (ts.isPropertySignature(member)) {
        const prop = extractInterfaceProperty(checker, member);
        if (prop) properties.push(prop);
      }
    }
    properties.sort((a, b) => a.name.localeCompare(b.name));
    return { properties };
  }

  // Intersection of object literals: A & { ... }
  if (ts.isIntersectionTypeNode(typeNode)) {
    const properties: DocInterfaceProperty[] = [];
    let sawLiteral = false;
    for (const part of typeNode.types) {
      if (ts.isTypeLiteralNode(part)) {
        sawLiteral = true;
        for (const member of part.members) {
          if (ts.isPropertySignature(member)) {
            const prop = extractInterfaceProperty(checker, member);
            if (prop) properties.push(prop);
          }
        }
      }
    }
    if (sawLiteral && properties.length) {
      properties.sort((a, b) => a.name.localeCompare(b.name));
      return { properties, typeSignature };
    }
  }

  const unionMembers = extractLiteralUnionMembers(typeNode);
  if (unionMembers?.length) {
    return { properties: [], typeSignature, unionMembers };
  }

  return { properties: [], typeSignature };
}

/** `'a' | 'b' | 1` → members for docs tables. */
function extractLiteralUnionMembers(typeNode: ts.TypeNode): DocEnumMember[] | undefined {
  const parts = ts.isUnionTypeNode(typeNode) ? typeNode.types : [typeNode];
  const members: DocEnumMember[] = [];
  for (const part of parts) {
    const node = ts.isParenthesizedTypeNode(part) ? part.type : part;
    if (!ts.isLiteralTypeNode(node)) return undefined;
    const lit = node.literal;
    if (ts.isStringLiteral(lit) || ts.isNoSubstitutionTemplateLiteral(lit)) {
      members.push({ name: lit.text, value: lit.text });
    } else if (ts.isNumericLiteral(lit)) {
      members.push({ name: lit.text, value: Number(lit.text) });
    } else if (lit.kind === ts.SyntaxKind.TrueKeyword) {
      members.push({ name: 'true', value: 'true' });
    } else if (lit.kind === ts.SyntaxKind.FalseKeyword) {
      members.push({ name: 'false', value: 'false' });
    } else if (lit.kind === ts.SyntaxKind.NullKeyword) {
      members.push({ name: 'null', value: 'null' });
    } else {
      return undefined;
    }
  }
  return members.length ? members : undefined;
}

export function extractEnumMember(node: ts.EnumMember): DocEnumMember {
  const name = (node.name as ts.Identifier).getText();
  let value: string | number = name;
  if (node.initializer) {
    if (ts.isNumericLiteral(node.initializer)) {
      value = parseInt(node.initializer.getText(), 10);
    } else if (ts.isStringLiteral(node.initializer)) {
      value = node.initializer.getText().slice(1, -1);
    }
  }
  return { name, value };
}

function unwrapExpression(expr: ts.Expression): ts.Expression {
  let current = expr;
  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    ts.isTypeAssertionExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function isPathHelperExpr(expr: ts.Expression): boolean {
  const inner = unwrapExpression(expr);
  if (!ts.isArrowFunction(inner) && !ts.isFunctionExpression(inner)) return false;
  if (!inner.body || ts.isBlock(inner.body)) return false;
  const ret = unwrapExpression(inner.body);
  return (
    ts.isTemplateExpression(ret) ||
    ts.isNoSubstitutionTemplateLiteral(ret) ||
    ts.isStringLiteral(ret)
  );
}

/** True when an object literal is a map of path-builder functions (e.g. REST `Routes`). */
export function isFunctionMapObject(obj: ts.ObjectLiteralExpression): boolean {
  const props = obj.properties.filter(ts.isPropertyAssignment);
  if (props.length < 8) return false;
  let helpers = 0;
  for (const prop of props) {
    if (isPathHelperExpr(prop.initializer)) helpers += 1;
  }
  return helpers / props.length >= 0.8;
}

function formatFunctionReturnPath(
  fn: ts.ArrowFunction | ts.FunctionExpression | ts.MethodDeclaration,
): string | undefined {
  if (!fn.body || ts.isBlock(fn.body)) return undefined;
  const expr = unwrapExpression(fn.body);
  if (
    ts.isTemplateExpression(expr) ||
    ts.isNoSubstitutionTemplateLiteral(expr) ||
    ts.isStringLiteral(expr)
  ) {
    return expr.getText();
  }
  return undefined;
}

function formatFunctionMapMemberType(
  checker: ts.TypeChecker,
  member: ts.PropertyAssignment | ts.MethodDeclaration,
): string {
  const fn: ts.ArrowFunction | ts.FunctionExpression | ts.MethodDeclaration | undefined =
    ts.isMethodDeclaration(member)
      ? member
      : ts.isArrowFunction(unwrapExpression(member.initializer)) ||
          ts.isFunctionExpression(unwrapExpression(member.initializer))
        ? (unwrapExpression(member.initializer) as ts.ArrowFunction | ts.FunctionExpression)
        : undefined;
  if (!fn) {
    return formatTypeFromType(checker, checker.getTypeAtLocation(member));
  }
  const params = fn.parameters
    .map((p) => {
      const name = ts.isIdentifier(p.name) ? p.name.text : p.name.getText();
      const optional = p.questionToken || p.initializer ? '?' : '';
      const type = p.type ? formatTypeNode(checker, p.type) : 'unknown';
      return `${name}${optional}: ${type}`;
    })
    .join(', ');
  const ret =
    formatFunctionReturnPath(fn) ??
    (fn.type ? formatTypeNode(checker, fn.type) : undefined) ??
    formatTypeFromType(checker, checker.getTypeAtLocation(member)).replace(/^[^=]*=>\s*/, '');
  return `(${params}) => ${ret}`;
}

export interface ExtractedConstFunctionMap {
  name: string;
  description?: string;
  properties: DocInterfaceProperty[];
  examples?: string[];
  see?: string[];
}

/**
 * Document `export const Routes = { channel: (id) => ..., ... }` as a named type
 * with one property per helper. Does not inline the object type onto callers.
 */
export function extractConstFunctionMap(
  checker: ts.TypeChecker,
  decl: ts.VariableDeclaration,
  statementComment: string,
): ExtractedConstFunctionMap | null {
  const name = ts.isIdentifier(decl.name) ? decl.name.text : undefined;
  if (!name || !/^[A-Z]/.test(name) || !decl.initializer) return null;
  const obj = unwrapExpression(decl.initializer);
  if (!ts.isObjectLiteralExpression(obj) || !isFunctionMapObject(obj)) return null;

  const properties: DocInterfaceProperty[] = [];
  for (const member of obj.properties) {
    if (!ts.isPropertyAssignment(member) && !ts.isMethodDeclaration(member)) continue;
    const propName = ts.isIdentifier(member.name)
      ? member.name.text
      : member.name.getText().replace(/^['"]|['"]$/g, '');
    const comment = getJSDoc(member);
    if (!propName || isHiddenMember(propName, comment)) continue;
    properties.push({
      name: propName,
      type: formatFunctionMapMemberType(checker, member),
      optional: false,
      readonly: true,
      description: getDescriptionFromJSDoc(comment) || undefined,
    });
  }
  properties.sort((a, b) => a.name.localeCompare(b.name));
  if (!properties.length) return null;

  const examples = getExamplesFromJSDoc(statementComment);
  return {
    name,
    description: getDescriptionFromJSDoc(statementComment) || undefined,
    properties,
    examples: examples.length ? examples : undefined,
    see: getSeeFromJSDoc(statementComment),
  };
}

/** True when an object literal is a string const map (`Events`, `ErrorCodes`). */
export function isStringConstEnumObject(obj: ts.ObjectLiteralExpression): boolean {
  const props = obj.properties.filter(ts.isPropertyAssignment);
  if (props.length < 8) return false;
  let literals = 0;
  for (const prop of props) {
    const init = unwrapExpression(prop.initializer);
    if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) literals += 1;
  }
  return literals / props.length >= 0.8;
}

/**
 * Document `export const Events = { Ready: 'ready', ... } as const` as an enum
 * so `Events.MessageCreate` can link to a generated SDK page.
 */
export function extractConstStringEnum(
  decl: ts.VariableDeclaration,
  statementComment: string,
  source?: DocSource,
): DocEnum | null {
  const name = ts.isIdentifier(decl.name) ? decl.name.text : undefined;
  if (!name || !/^[A-Z]/.test(name) || !decl.initializer) return null;
  const obj = unwrapExpression(decl.initializer);
  if (!ts.isObjectLiteralExpression(obj) || !isStringConstEnumObject(obj)) return null;

  const members: DocEnumMember[] = [];
  for (const member of obj.properties) {
    if (!ts.isPropertyAssignment(member)) continue;
    const propName = ts.isIdentifier(member.name)
      ? member.name.text
      : member.name.getText().replace(/^['"]|['"]$/g, '');
    const comment = getJSDoc(member);
    if (!propName || isHiddenMember(propName, comment)) continue;
    const init = unwrapExpression(member.initializer);
    const value =
      ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init) ? init.text : propName;
    members.push({ name: propName, value });
  }
  members.sort((a, b) => a.name.localeCompare(b.name));
  if (!members.length) return null;

  return {
    id: `enum:${name}`,
    name,
    kind: 'enum',
    description: getDescriptionFromJSDoc(statementComment) || undefined,
    members,
    source,
    see: getSeeFromJSDoc(statementComment),
  };
}
