import * as ts from 'typescript';

/**
 * Strip import("..."). prefixes from type strings.
 * TS checker emits these for types from other modules - we want just the type name.
 */
function sanitizeTypeString(s: string): string {
  return s.replace(/\bimport\s*\(["']([^"']*)["']\)\s*\./g, '');
}

/**
 * Convert a TypeScript type to a readable string for documentation.
 */
export function formatTypeNode(checker: ts.TypeChecker, typeNode: ts.TypeNode | undefined): string {
  if (!typeNode) return 'void';
  const type = checker.getTypeFromTypeNode(typeNode);
  const raw = checker.typeToString(type, typeNode, ts.TypeFormatFlags.None);
  return sanitizeTypeString(raw);
}

export function formatTypeFromType(checker: ts.TypeChecker, type: ts.Type): string {
  const raw = checker.typeToString(type, undefined, ts.TypeFormatFlags.None);
  return sanitizeTypeString(raw);
}
