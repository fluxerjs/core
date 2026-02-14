import type { Client } from '../client/Client.js';
import { Base } from './Base.js';
import type { APIUserPartial } from '@fluxerjs/types';
import { CDN_URL } from '../util/Constants.js';

export class User extends Base {
  readonly client: Client;
  readonly id: string;
  username: string;
  discriminator: string;
  globalName: string | null;
  avatar: string | null;
  readonly bot: boolean;

  constructor(client: Client, data: APIUserPartial) {
    super();
    this.client = client;
    this.id = data.id;
    this.username = data.username;
    this.discriminator = data.discriminator;
    this.globalName = data.global_name ?? null;
    this.avatar = data.avatar ?? null;
    this.bot = !!(data as APIUserPartial & { bot?: boolean }).bot;
  }

  avatarURL(options?: { size?: number; extension?: string }): string | null {
    if (!this.avatar) return null;
    const ext = options?.extension ?? 'png';
    const size = options?.size ? `?size=${options.size}` : '';
    return `${CDN_URL}/avatars/${this.id}/${this.avatar}.${ext}${size}`;
  }

  displayAvatarURL(options?: { size?: number }): string {
    return this.avatarURL(options) ?? `${CDN_URL}/avatars/0/0.png`;
  }

  toString(): string {
    return `<@${this.id}>`;
  }
}
