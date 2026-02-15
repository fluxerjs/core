/**
 * Output schema for the custom doc generator.
 */

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
}

export interface DocSource {
  file: string;
  line: number;
  /** Path relative to repo root, e.g. packages/fluxer-core/src/Client.ts */
  path?: string;
}

export interface DocClass {
  name: string;
  description?: string;
  extends?: string;
  constructor?: DocConstructor;
  properties: DocProperty[];
  methods: DocMethod[];
  source?: DocSource;
  deprecated?: boolean | string;
}

export interface DocInterfaceProperty {
  name: string;
  type: string;
  optional?: boolean;
  description?: string;
}

export interface DocInterface {
  name: string;
  description?: string;
  properties: DocInterfaceProperty[];
  source?: DocSource;
}

export interface DocEnumMember {
  name: string;
  value: string | number;
}

export interface DocEnum {
  name: string;
  description?: string;
  members: DocEnumMember[];
  source?: DocSource;
}

export interface DocOutput {
  meta: DocMeta;
  package: string;
  classes: DocClass[];
  interfaces: DocInterface[];
  enums: DocEnum[];
}
