/** Mirrors @fluxerjs/docgen v2 schema for the docs app. */

export interface DocMeta {
  generator: string;
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
  path?: string;
}

export interface DocClass {
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
  methods?: DocMethod[];
  extends?: string[];
  typeSignature?: string;
  unionMembers?: DocEnumMember[];
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
  version?: string;
  packages?: string[];
  classes: DocClass[];
  interfaces: DocInterface[];
  enums: DocEnum[];
}
