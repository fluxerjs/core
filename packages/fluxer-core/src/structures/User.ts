import { Client } from '../client/Client.js';
import { Base } from './Base.js';
import { MessageSendOptions } from '../util/messageUtils.js';
import { APIChannelPartial, APIUserPartial } from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';
import { CDN_URL } from '../util/Constants.js';
import { cdnDefaultAvatarURL } from '../util/cdn.js';
import { DMChannel } from './Channel.js';
import { Message } from './Message';

/** Represents a user (or bot) on Fluxer. */
export class User extends Base {
  readonly client: Client;
  readonly id: string;
  username: string;
  discriminator: string;
  globalName: string | null;
  avatar: string | null;
  readonly bot: boolean;
  /** RGB avatar color (e.g. 7577782). Null if not set. */
  avatarColor: number | null;
  /** Public flags bitfield. Null if not set. */
  flags: number | null;
  /** Whether this is an official system user. */
  readonly system: boolean;
  /** Banner hash (from profile, member, or invite context). Null when not available. */
  banner: string | null;

  /** @param data - API user from message author, GET /users/{id}, or GET /users/@me */
  constructor(client: Client, data: APIUserPartial) {
    super();
    this.client = client;
    this.id = data.id;
    this.username = data.username;
    this.discriminator = data.discriminator;
    this.globalName = data.global_name ?? null;
    this.avatar = data.avatar ?? null;
    this.bot = !!data.bot;
    this.avatarColor = data.avatar_color ?? null;
    this.flags = data.flags ?? data.public_flags ?? null;
    this.system = !!data.system;
    this.banner = data.banner ?? null;
  }

  /** Update mutable fields from fresh API data. Used by getOrCreateUser cache. */
  _patch(data: APIUserPartial): void {
    this.username = data.username;
    this.discriminator = data.discriminator;
    this.globalName = data.global_name ?? null;
    this.avatar = data.avatar ?? null;
    if (data.avatar_color !== undefined) this.avatarColor = data.avatar_color;
    if (data.flags !== undefined) this.flags = data.flags;
    if (data.banner !== undefined) this.banner = data.banner;
  }

  /**
   * Get the URL for this user's avatar.
   * Auto-detects animated avatars (hash starting with `a_`) and uses gif extension.
   * @param options - Optional `size` and `extension` (default: png, or gif for animated)
   */
  avatarURL(options?: { size?: number; extension?: string }): string | null {
    if (!this.avatar) return null;
    const ext = this.avatar.startsWith('a_') ? 'gif' : (options?.extension ?? 'png');
    const size = options?.size ? `?size=${options.size}` : '';
    return `${CDN_URL}/avatars/${this.id}/${this.avatar}.${ext}${size}`;
  }

  /** Get the avatar URL, or the default avatar if none set (Fluxer: fluxerstatic.com). */
  displayAvatarURL(options?: { size?: number; extension?: string }): string {
    return this.avatarURL(options) ?? cdnDefaultAvatarURL(this.id);
  }

  /**
   * Get the URL for this user's banner.
   * Returns null if the user has no banner (only available when fetched from profile/member context).
   */
  bannerURL(options?: { size?: number; extension?: string }): string | null {
    if (!this.banner) return null;
    const ext = this.banner.startsWith('a_') ? 'gif' : (options?.extension ?? 'png');
    const size = options?.size ? `?size=${options.size}` : '';
    return `${CDN_URL}/banners/${this.id}/${this.banner}.${ext}${size}`;
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
    const data = await this.client.rest.post(Routes.userMeChannels(), {
      body: { recipient_id: this.id },
      auth: true,
    });
    return new DMChannel(this.client, data as APIChannelPartial);
  }

  /**
   * Send a DM to this user.
   * Convenience method that creates the DM channel and sends the message.
   */
  async send(options: MessageSendOptions): Promise<Message> {
    const dm = await this.createDM();
    return dm.send(options);
  }
}
