import { Collection } from '@fluxerjs/collection';
import type { APIChannelOverwrite, OverwriteType } from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';
import { type PermissionResolvable, resolvePermissionsToBitfield } from '@fluxerjs/util';
import type { GuildChannel } from './Guild.js';
import { PermissionOverwrite } from './PermissionOverwrite.js';

/** Options for {@link PermissionOverwriteManager.edit}. */
export interface PermissionOverwriteEditOptions {
  type: OverwriteType;
  allow?: PermissionResolvable;
  deny?: PermissionResolvable;
}

/**
 * Manages channel permission overwrites (`edit` / `delete` / `cache`).
 * Requires Manage Roles for mutations.
 */
export class PermissionOverwriteManager {
  private readonly _cache = new Collection<string, PermissionOverwrite>();

  constructor(
    private readonly channel: GuildChannel,
    initial: APIChannelOverwrite[] = [],
  ) {
    this._patch(initial);
  }

  /** Cached overwrites keyed by role/member ID. */
  get cache(): Collection<string, PermissionOverwrite> {
    return this._cache;
  }

  get size(): number {
    return this._cache.size;
  }

  [Symbol.iterator](): IterableIterator<PermissionOverwrite> {
    return this._cache.values();
  }

  /** Wire-shaped overwrites for permission computation. */
  toJSON(): APIChannelOverwrite[] {
    return [...this._cache.values()].map((o) => o.toJSON());
  }

  /** Edit or create a permission overwrite. */
  async edit(overwriteId: string, options: PermissionOverwriteEditOptions): Promise<void> {
    const allow = options.allow !== undefined ? resolvePermissionsToBitfield(options.allow) : '0';
    const deny = options.deny !== undefined ? resolvePermissionsToBitfield(options.deny) : '0';
    await this.channel.client.rest.put(Routes.channelPermission(this.channel.id, overwriteId), {
      body: { type: options.type, allow, deny },
      auth: true,
    });
    this._cache.set(
      overwriteId,
      new PermissionOverwrite({
        id: overwriteId,
        type: options.type,
        allow,
        deny,
      }),
    );
  }

  /** Delete a permission overwrite. */
  async delete(overwriteId: string): Promise<void> {
    await this.channel.client.rest.delete(Routes.channelPermission(this.channel.id, overwriteId), {
      auth: true,
    });
    this._cache.delete(overwriteId);
  }

  /** @internal Sync from an API channel payload. */
  _patch(overwrites: APIChannelOverwrite[] | null | undefined): void {
    this._cache.clear();
    for (const entry of overwrites ?? []) {
      this._cache.set(entry.id, new PermissionOverwrite(entry));
    }
  }
}
