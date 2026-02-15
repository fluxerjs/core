/**
 * Doc schema - matches output from @fluxerjs/docgen
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
  /** Path relative to repo root for GitHub links */
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
  /** Package name e.g. @fluxerjs/core */
  package?: string;
}

export interface DocInterfaceProperty {
  name: string;
  type: string;
  optional?: boolean;
  description?: string;
  examples?: string[];
}

export interface DocInterface {
  name: string;
  description?: string;
  properties: DocInterfaceProperty[];
  source?: DocSource;
  /** Package name e.g. @fluxerjs/core */
  package?: string;
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
  /** Package name e.g. @fluxerjs/core */
  package?: string;
}

export interface DocOutput {
  meta: DocMeta;
  package: string;
  /** SDK version e.g. 1.0.5 */
  version?: string;
  /** Available packages for filtering */
  packages?: string[];
  classes: DocClass[];
  interfaces: DocInterface[];
  enums: DocEnum[];
}
