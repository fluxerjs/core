import type { APIUserPartial, GatewayPresenceUpdateData } from '@fluxerjs/types';
import { GatewayOpcodes, Routes } from '@fluxerjs/types';

import { User } from '../Domain/User.js';
import type { Client } from './Client.js';
import type { PartialUserGuildPayload } from './EventPayloads.js';
import {
  type PresenceUpdateOptions,
  type SudoVerificationOptions,
  toPresenceWire,
  toSudoBody,
} from './SdkOptions/index.js';

/** The logged-in bot/user (`client.user`). */
export class ClientUser extends User {
  declare readonly client: Client;

  /** Broadcast presence (gateway opcode 3) on all shards. */
  setPresence(presence: PresenceUpdateOptions): void {
    this.client.options.presence = presence;
    const wire = toPresenceWire(presence) as unknown as GatewayPresenceUpdateData;
    this.client._sendToAllShards({ op: GatewayOpcodes.PresenceUpdate, d: wire });
  }

  /** GET /users/@me — refresh the logged-in user from REST and patch this instance. */
  async fetch(): Promise<this> {
    const data = await this.client.rest.get<APIUserPartial>(Routes.currentUser(), { auth: true });
    this._patch(data);
    return this;
  }

  /** GET /users/@me/guilds — returns camelCase partial guilds. */
  async fetchGuilds(options?: { withCounts?: boolean }): Promise<PartialUserGuildPayload[]> {
    const path = Routes.currentUserGuilds() + (options?.withCounts ? '?with_counts=true' : '');
    const data = await this.client.rest.get<
      Array<{
        id: string;
        name: string;
        icon: string | null;
        owner?: boolean;
        permissions?: string | null;
        features?: string[];
        approximate_member_count?: number;
        approximate_presence_count?: number;
      }>
    >(path, { auth: true });
    return data.map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon ?? null,
      ...(g.owner !== undefined ? { owner: g.owner } : {}),
      ...(g.permissions !== undefined ? { permissions: g.permissions } : {}),
      ...(g.features !== undefined ? { features: g.features } : {}),
      ...(g.approximate_member_count !== undefined
        ? { approximateMemberCount: g.approximate_member_count }
        : {}),
      ...(g.approximate_presence_count !== undefined
        ? { approximatePresenceCount: g.approximate_presence_count }
        : {}),
    }));
  }

  /**
   * Leave a guild (`client.user.leaveGuild`).
   * DELETE /users/@me/guilds/{guild_id}.
   *
   * @param guildId - Guild to leave
   * @param options - Optional sudo / MFA body for user accounts
   * @example
   * await client.user.leaveGuild(guildId);
   */
  async leaveGuild(guildId: string, options?: SudoVerificationOptions): Promise<void> {
    const body = options ? toSudoBody(options) : undefined;
    await this.client.rest.delete(Routes.leaveGuild(guildId), {
      body: body && Object.keys(body).length ? body : undefined,
      auth: true,
    });
  }

  /** Delete every message authored by the caller across a guild (sudo). */
  async bulkDeleteMyMessagesInGuild(
    guildId: string,
    options?: SudoVerificationOptions,
  ): Promise<void> {
    const body = options ? toSudoBody(options) : undefined;
    await this.client.rest.post(Routes.guildBulkDeleteMine(guildId), {
      body: body && Object.keys(body).length ? body : undefined,
      auth: true,
    });
  }
}
