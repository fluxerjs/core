import type { Client } from '../client/Client.js';
import { Base } from './Base.js';
import type { APIRole } from '@fluxerjs/types';

/** Represents a role in a guild. */
export class Role extends Base {
  readonly client: Client;
  readonly id: string;
  readonly guildId: string;
  name: string;
  color: number;
  position: number;
  permissions: string;
  hoist: boolean;
  mentionable: boolean;
  unicodeEmoji: string | null;

  /** @param client - The client instance */
  /** @param data - API role from GET /guilds/{id}/roles or gateway role events */
  /** @param guildId - The guild this role belongs to */
  constructor(client: Client, data: APIRole, guildId: string) {
    super();
    this.client = client;
    this.id = data.id;
    this.guildId = guildId;
    this.name = data.name;
    this.color = data.color;
    this.position = data.position;
    this.permissions = data.permissions;
    this.hoist = !!data.hoist;
    this.mentionable = !!data.mentionable;
    this.unicodeEmoji = data.unicode_emoji ?? null;
  }

  /** Returns a mention string (e.g. `<@&123456>`). */
  toString(): string {
    return `<@&${this.id}>`;
  }
}
