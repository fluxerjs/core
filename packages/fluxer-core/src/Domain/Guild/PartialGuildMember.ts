import type { Client } from '../../ClientCore/Client.js';
import type { User } from '../User.js';
import type { Guild } from './Guild.js';
import type { GuildMember } from './GuildMember.js';

/**
 * Uncached `guildMemberRemove` payload.
 * Has `user` and `guild` (what leave logs need) but not `joinedAt`, roles, or member methods.
 * Narrow with `member.partial` (`GuildMember.partial` is `false`).
 * Call {@link fetch} to hydrate when the member is still in the guild.
 */
export class PartialGuildMember {
  readonly partial = true as const;
  readonly client: Client;
  readonly id: string;
  readonly user: User;
  readonly guildId: string;
  readonly guild: Guild;

  constructor(data: {
    client: Client;
    id: string;
    user: User;
    guild: Guild;
  }) {
    this.client = data.client;
    this.id = data.id;
    this.user = data.user;
    this.guild = data.guild;
    this.guildId = data.guild.id;
  }

  /**
   * Fetch the full {@link GuildMember} from the API (cache-aware via `guild.members.fetch`).
   * @throws FluxerError with MEMBER_NOT_FOUND if the user is not in the guild
   */
  async fetch(): Promise<GuildMember> {
    return this.guild.members.fetch(this.id);
  }
}
