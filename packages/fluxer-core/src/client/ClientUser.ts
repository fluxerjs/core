import { Client } from './Client.js';
import { User } from '../structures/User.js';
import { APIGuild, APIUserPartial } from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';
import { Guild } from '../structures/Guild.js';

export class ClientUser extends User {
  declare readonly client: Client;

  constructor(client: Client, data: APIUserPartial) {
    super(client, { ...data });
  }

  /**
   * Fetch guilds the bot is a member of.
   * @returns Array of Guild objects (cached in client.guilds)
   */
  async fetchGuilds(): Promise<Guild[]> {
    const data = await this.client.rest.get<APIGuild[] | { guilds?: APIGuild[] }>(
      Routes.currentUserGuilds(),
    );
    const list = Array.isArray(data) ? data : (data?.guilds ?? []);
    const guilds: Guild[] = [];
    for (const g of list) {
      const guild = new Guild(this.client, g);
      this.client.guilds.set(guild.id, guild);
      guilds.push(guild);
    }
    return guilds;
  }

  /**
   * Leave a guild. Requires the bot to be a member.
   * @param guildId - The guild ID to leave
   */
  async leaveGuild(guildId: string): Promise<void> {
    await this.client.rest.delete(Routes.leaveGuild(guildId), { auth: true });
    this.client.guilds.delete(guildId);
  }
}
