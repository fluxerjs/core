import type { Client } from '../client/Client.js';
import { Base } from './Base.js';
import { User } from './User.js';
import type { Guild } from './Guild.js';
import type { APIGuildMember } from '@fluxerjs/types';

export class GuildMember extends Base {
  readonly client: Client;
  readonly id: string;
  readonly user: User;
  readonly guild: Guild;
  nick: string | null;
  readonly roles: string[];
  readonly joinedAt: Date;
  communicationDisabledUntil: Date | null;

  constructor(client: Client, data: APIGuildMember & { guild_id?: string }, guild: Guild) {
    super();
    this.client = client;
    this.user = new User(client, data.user);
    this.id = data.user.id;
    this.guild = guild;
    this.nick = data.nick ?? null;
    this.roles = data.roles ?? [];
    this.joinedAt = new Date(data.joined_at);
    this.communicationDisabledUntil = data.communication_disabled_until ? new Date(data.communication_disabled_until) : null;
  }

  get displayName(): string {
    return this.nick ?? this.user.globalName ?? this.user.username;
  }
}
