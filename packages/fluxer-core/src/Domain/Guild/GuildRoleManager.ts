import { LimitedCollection } from '@fluxerjs/collection';
import type { Role } from './Role.js';

/**
 * Guild role cache. Extends {@link LimitedCollection} (`.get()`, `.set()`, `.filter()`, …).
 * Access via {@link Guild.roles}.
 */
export class GuildRoleManager extends LimitedCollection<string, Role> {
  constructor(
    private readonly guildId: string,
    options?: ConstructorParameters<typeof LimitedCollection<string, Role>>[0],
  ) {
    super(options);
  }

  /** The @everyone role (`id === guild.id`), or undefined if uncached. */
  get everyone(): Role | undefined {
    return this.get(this.guildId);
  }
}
