/**
 * Output schema for the custom doc generator (v2).
 */

export interface DocMeta {
  generator: string;
  /** Schema version of this JSON shape */
  version: string;
  date: number;
}

export interface DocParam {
  name: string;
  type: string;
  optional?: boolean;
  description?: string;
}

export interface DocConstructor {
  params: DocParam[];
  description?: string;
  examples?: string[];
}

export interface DocProperty {
  name: string;
  type: string;
  readonly?: boolean;
  description?: string;
  examples?: string[];
  optional?: boolean;
  static?: boolean;
}

export interface DocMethod {
  name: string;
  params: DocParam[];
  returns: string;
  description?: string;
  examples?: string[];
  async?: boolean;
  deprecated?: boolean | string;
  source?: DocSource;
  see?: string[];
  static?: boolean;
}

export interface DocSource {
  file: string;
  line: number;
  /** Path relative to repo root, e.g. packages/fluxer-core/src/Client.ts */
  path?: string;
}

export interface DocClass {
  /** Stable id e.g. class:Client */
  id: string;
  name: string;
  kind: 'class';
  description?: string;
  extends?: string;
  constructor?: DocConstructor;
  properties: DocProperty[];
  methods: DocMethod[];
  source?: DocSource;
  deprecated?: boolean | string;
  package?: string;
  see?: string[];
}

export interface DocInterfaceProperty {
  name: string;
  type: string;
  optional?: boolean;
  description?: string;
  readonly?: boolean;
}

export interface DocInterface {
  id: string;
  name: string;
  kind: 'interface';
  description?: string;
  properties: DocInterfaceProperty[];
  /** Method signatures on the interface (if any). */
  methods?: DocMethod[];
  /** Heritage type names. */
  extends?: string[];
  /**
   * For `export type` aliases that are not object shapes (unions, primitives, etc.).
   * Object-literal aliases expand into `properties` instead.
   */
  typeSignature?: string;
  /** String/number literal union members (e.g. EmbedType = 'rich' | 'image' | …). */
  unionMembers?: DocEnumMember[];
  /** `@example` blocks from the type or const JSDoc. */
  examples?: string[];
  source?: DocSource;
  package?: string;
  see?: string[];
}

export interface DocEnumMember {
  name: string;
  value: string | number;
}

export interface DocEnum {
  id: string;
  name: string;
  kind: 'enum';
  description?: string;
  members: DocEnumMember[];
  source?: DocSource;
  package?: string;
  see?: string[];
}

export type DocSymbol = DocClass | DocInterface | DocEnum;

export interface DocOutput {
  meta: DocMeta;
  package: string;
  /** SDK version e.g. 2.0.0 */
  version?: string;
  /** Available packages for filtering */
  packages?: string[];
  classes: DocClass[];
  interfaces: DocInterface[];
  enums: DocEnum[];
}
