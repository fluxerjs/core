import type { APIBan } from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';
import type { Client } from '../../ClientCore/Client.js';
import { Base } from '../Base.js';
import type { User } from '../User.js';

function parseOptionalDate(value: string | null | undefined): Date | null {
  if (value == null || value === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Represents a ban in a guild. */
export class GuildBan extends Base {
  readonly client: Client;
  readonly guildId: string;
  readonly user: User;
  readonly reason: string | null;
  /** When a temporary ban expires. Null for permanent bans. */
  readonly expiresAt: Date | null;

  /** @param data - API ban from GET /guilds/{id}/bans or gateway GUILD_BAN_ADD */
  constructor(client: Client, data: APIBan & { guild_id?: string }, guildId: string) {
    super();
    this.client = client;
    this.guildId = data.guild_id ?? guildId;
    this.user = client.getOrCreateUser(data.user);
    this.reason = data.reason ?? null;
    this.expiresAt = parseOptionalDate(data.expires_at);
  }

  /**
   * Remove this ban (unban the user).
   * Requires Ban Members permission.
   */
  async unban(): Promise<void> {
    await this.client.rest.delete(Routes.guildBan(this.guildId, this.user.id), {
      auth: true,
    });
  }
}
