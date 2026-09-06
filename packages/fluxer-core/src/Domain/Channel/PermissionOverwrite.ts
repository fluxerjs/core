import type { APIChannelOverwrite, OverwriteType } from '@fluxerjs/types';
import { PermissionsBitField } from '@fluxerjs/util';

/** CamelCase permission overwrite on a guild channel. */
export class PermissionOverwrite {
  readonly id: string;
  readonly type: OverwriteType;
  /** @internal Raw allow bitfield string. */
  _allow: string;
  /** @internal Raw deny bitfield string. */
  _deny: string;

  constructor(data: APIChannelOverwrite) {
    this.id = data.id;
    this.type = data.type;
    this._allow = data.allow ?? '0';
    this._deny = data.deny ?? '0';
  }

  /** Allowed permissions for this overwrite. */
  get allow(): PermissionsBitField {
    return new PermissionsBitField(BigInt(this._allow || '0'));
  }

  /** Denied permissions for this overwrite. */
  get deny(): PermissionsBitField {
    return new PermissionsBitField(BigInt(this._deny || '0'));
  }

  /** Wire shape for permission computation / REST. */
  toJSON(): APIChannelOverwrite {
    return {
      id: this.id,
      type: this.type,
      allow: this._allow,
      deny: this._deny,
    };
  }
}
