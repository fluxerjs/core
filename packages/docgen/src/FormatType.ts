import * as ts from 'typescript';

/**
 * Strip import("..."). prefixes from type strings.
 * TS checker emits these for types from other modules - we want just the type name.
 */
function sanitizeTypeString(s: string): string {
  return s
    .replace(/\bimport\s*\(["']([^"']*)["']\)\s*\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Prefer the author's type-node text for unions/literals so aliases like
 * `EmbedType = 'rich' | 'image'` don't collapse to just `EmbedType`.
 */
export function formatTypeNode(checker: ts.TypeChecker, typeNode: ts.TypeNode | undefined): string {
  if (!typeNode) return 'void';

  if (
    ts.isUnionTypeNode(typeNode) ||
    ts.isIntersectionTypeNode(typeNode) ||
    ts.isLiteralTypeNode(typeNode) ||
    ts.isParenthesizedTypeNode(typeNode) ||
    ts.isArrayTypeNode(typeNode) ||
    ts.isTupleTypeNode(typeNode) ||
    ts.isTypeOperatorNode(typeNode) ||
    ts.isTypeQueryNode(typeNode) ||
    ts.isTypeReferenceNode(typeNode) ||
    ts.isConditionalTypeNode(typeNode) ||
    ts.isMappedTypeNode(typeNode) ||
    ts.isTemplateLiteralTypeNode(typeNode)
  ) {
    const fromSource = sanitizeTypeString(typeNode.getText());
    if (fromSource && fromSource !== 'any') return fromSource;
  }

  const fromSource = sanitizeTypeString(typeNode.getText());
  const type = checker.getTypeFromTypeNode(typeNode);
  const raw = sanitizeTypeString(
    checker.typeToString(
      type,
      typeNode,
      ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.InTypeAlias,
    ),
  );
  // Prefer the author's annotation when the checker expands a huge object type.
  if (fromSource && fromSource !== 'any' && raw.length > 200 && fromSource.length < raw.length) {
    return fromSource;
  }
  return raw || fromSource;
}

export function formatTypeFromType(checker: ts.TypeChecker, type: ts.Type): string {
  const raw = checker.typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation);
  return sanitizeTypeString(raw);
}

/** Expand a type alias RHS to a readable signature (never just the alias name). */
export function formatTypeAliasSignature(
  checker: ts.TypeChecker,
  node: ts.TypeAliasDeclaration,
): string {
  const fromSource = sanitizeTypeString(node.type.getText());
  if (fromSource) return fromSource;
  return formatTypeNode(checker, node.type);
}
