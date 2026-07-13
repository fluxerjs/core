import type { APIChannelPartial, APIUserPartial } from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';

import type { Client } from '../client/Client.js';
import type { MessagePrepareInput } from '../util/messageUtils.js';
import { cdnAvatarURL, cdnBannerURL, cdnDefaultAvatarURL } from '../util/cdn.js';
import { Base } from './Base.js';
import { DMChannel } from './Channel.js';
import type { Message } from './Message.js';

/**
 * User (or bot) on Fluxer.
 * Cached in {@link Client.users} and hydrated via {@link Client.getOrCreateUser}.
 */
export class User extends Base {
  /** Parent client instance. */
  readonly client: Client;
  /** User snowflake ID. */
  readonly id: string;
  /** Username (not unique across the platform). */
  username: string;
  /** Legacy discriminator (e.g., `"0001"`). */
  discriminator: string;
  /** Display name (preferred over username). */
  globalName: string | null;
  /** Avatar hash (null = default avatar). */
  avatar: string | null;
  /** Whether this user is a bot. */
  readonly bot: boolean;
  /** Accent color for the profile (24-bit RGB). */
  avatarColor: number | null;
  /** User flags bitfield (badges, staff, etc.). */
  flags: number | null;
  /** Whether this is a system user (e.g., Fluxer System). */
  readonly system: boolean;
  /** Banner hash for profile. */
  banner: string | null;

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
    this.flags = data.flags ?? null;
    this.system = !!data.system;
    this.banner = data.banner ?? null;
  }

  /** @internal */
  _patch(data: APIUserPartial): void {
    this.username = data.username;
    this.discriminator = data.discriminator;
    this.globalName = data.global_name ?? null;
    this.avatar = data.avatar ?? null;
    if (data.avatar_color !== undefined) this.avatarColor = data.avatar_color;
    if (data.flags !== undefined) this.flags = data.flags;
    if (data.banner !== undefined) this.banner = data.banner;
  }

  private cdnOpts(): { mediaBase: string; staticCdnBase: string } {
    return {
      mediaBase: this.client.instance.endpoints.media,
      staticCdnBase: this.client.instance.endpoints.static_cdn,
    };
  }

  /**
   * User avatar CDN URL (null if no custom avatar set).
   * @param options - Size and extension options
   * @returns CDN URL or null
   */
  avatarURL(options?: { size?: number; extension?: string }): string | null {
    return cdnAvatarURL(this.id, this.avatar, { ...options, ...this.cdnOpts() });
  }

  /**
   * User avatar URL or default avatar fallback.
   * @param options - Size and extension options
   * @returns CDN URL (never null)
   */
  displayAvatarURL(options?: { size?: number; extension?: string }): string {
    return this.avatarURL(options) ?? cdnDefaultAvatarURL(this.id, this.cdnOpts());
  }

  /**
   * User banner CDN URL (null if no banner set).
   * @param options - Size and extension options
   * @returns CDN URL or null
   */
  bannerURL(options?: { size?: number; extension?: string }): string | null {
    return cdnBannerURL(this.id, this.banner, { ...options, ...this.cdnOpts() });
  }

  /**
   * Format as a mention string (`<@id>`).
   * @returns Mention syntax
   */
  toString(): string {
    return `<@${this.id}>`;
  }

  /**
   * Create or fetch the DM channel with this user.
   * @returns DM channel instance (cached if already open)
   */
  async createDM(): Promise<DMChannel> {
    const data = await this.client.rest.post(Routes.userMeChannels(), {
      body: { recipient_id: this.id },
      auth: true,
    });
    const channel = new DMChannel(this.client, data as APIChannelPartial);
    this.client.channels.set(channel.id, channel);
    return channel;
  }

  /**
   * Send a DM to this user.
   * @param options - {@link MessagePrepareInput}
   * @returns Sent message
   */
  async send(options: MessagePrepareInput): Promise<Message> {
    return (await this.createDM()).send(options);
  }
}
