import type { Client } from '../client/Client.js';
import { Base } from './Base.js';
import type { APIUserPartial } from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';
import { CDN_URL } from '../util/Constants.js';
import type { DMChannel } from './Channel.js';

/** Represents a user (or bot) on Fluxer. */
export class User extends Base {
  readonly client: Client;
  readonly id: string;
  username: string;
  discriminator: string;
  globalName: string | null;
  avatar: string | null;
  readonly bot: boolean;

  /** @param data - API user from message author, GET /users/{id}, or GET /users/@me */
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

  /** Update mutable fields from fresh API data. Used by getOrCreateUser cache. */
  _patch(data: APIUserPartial): void {
    this.username = data.username;
    this.discriminator = data.discriminator;
    this.globalName = data.global_name ?? null;
    this.avatar = data.avatar ?? null;
  }

  /**
   * Get the URL for this user's avatar.
   * @param options - Optional `size` and `extension` (default: `png`)
   */
  avatarURL(options?: { size?: number; extension?: string }): string | null {
    if (!this.avatar) return null;
    const ext = options?.extension ?? 'png';
    const size = options?.size ? `?size=${options.size}` : '';
    return `${CDN_URL}/avatars/${this.id}/${this.avatar}.${ext}${size}`;
  }

  /** Get the avatar URL, or the default avatar if none set. */
  displayAvatarURL(options?: { size?: number }): string {
    return this.avatarURL(options) ?? `${CDN_URL}/avatars/0/0.png`;
  }

  /** Returns a mention string (e.g. `<@123456>`). */
  toString(): string {
    return `<@${this.id}>`;
  }

  /**
   * Create or get a DM channel with this user.
   * Returns the DM channel; use {@link DMChannel.send} to send messages.
   */
  async createDM(): Promise<DMChannel> {
    const { DMChannel: DMChannelClass } = await import('./Channel.js');
    const data = await this.client.rest.post(Routes.userMeChannels(), {
      body: { recipient_id: this.id },
      auth: true,
    });
    return new DMChannelClass(this.client, data as import('@fluxerjs/types').APIChannelPartial);
  }

  /**
   * Send a DM to this user.
   * Convenience method that creates the DM channel and sends the message.
   */
  async send(
    options: string | { content?: string; embeds?: unknown[] }
  ): Promise<import('./Message.js').Message> {
    const dm = await this.createDM();
    return dm.send(options);
  }
}
