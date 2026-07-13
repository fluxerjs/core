import { Collection } from '@fluxerjs/collection';
import type {
  AuditLogActionType,
  ChannelCreateRequest,
  DefaultMessageNotifications,
  GuildExplicitContentFilter,
  GuildFeature,
  GuildMFALevel,
  GuildVerificationLevel,
} from '@fluxerjs/types';
import { GuildNSFWLevel } from '@fluxerjs/types';
import type { Client } from '../../client/Client.js';
import type { AuditLogFetchPayload, VanityURLPayload } from '../../client/eventPayloads.js';
import type {
  DiscoveryApplicationOptions,
  DiscoveryApplicationPayload,
  DiscoveryStatusPayload,
  SudoVerificationOptions,
} from '../../client/sdkOptions.js';
import { GuildMemberManager } from '../../client/GuildMemberManager.js';
import { Base } from '../Base.js';
import type { GuildChannel } from '../Channel.js';
import type { GuildBan } from '../GuildBan.js';
import type { GuildEmoji } from '../GuildEmoji.js';
import type { GuildMember } from '../GuildMember.js';
import type { GuildSticker } from '../GuildSticker.js';
import type { Invite } from '../Invite.js';
import { Role } from '../Role.js';
import type { RoleCreateOptions } from '../roleOptions.js';
import type { Webhook } from '../Webhook.js';
import * as admin from './admin.js';
import * as channels from './channels.js';
import * as emojis from './emojis.js';
import { cdnURL } from './http.js';
import * as members from './members.js';
import * as moderation from './moderation.js';
import * as roles from './roles.js';
import * as stickers from './stickers.js';
import type {
  ChannelPositionUpdate,
  GuildBanOptions,
  GuildData,
  GuildEditOptions,
} from './types.js';

export type { ChannelPositionUpdate, GuildBanOptions, GuildEditOptions } from './types.js';

/** Represents a Fluxer guild (server). */
export class Guild extends Base {
  /** The {@link Client} that instantiated this guild. */
  readonly client: Client;
  /** Snowflake ID of this guild. */
  readonly id: string;
  /** Whether the guild is currently available through the gateway. */
  available = true;
  /** Guild name. */
  name: string;
  /** Icon hash (use {@link iconURL} to get full CDN URL). */
  icon: string | null;
  /** Banner hash (use {@link bannerURL} to get full CDN URL). */
  banner: string | null;
  /** User ID of the guild owner. */
  ownerId: string;
  /** Invite splash hash (use {@link splashURL} to get full CDN URL). */
  splash: string | null;
  /** Vanity invite code if the guild has one. */
  vanityURLCode: string | null;
  /** Features enabled for this guild. */
  features: GuildFeature[];
  /** Verification level required for members to send messages. */
  verificationLevel: GuildVerificationLevel;
  /** Default notification level for members. */
  defaultMessageNotifications: DefaultMessageNotifications;
  /** Explicit content filter level. */
  explicitContentFilter: GuildExplicitContentFilter;
  /** AFK voice channel ID, or null if none. */
  afkChannelId: string | null;
  /** AFK timeout in seconds. */
  afkTimeout: number;
  /** System messages channel ID, or null if none. */
  systemChannelId: string | null;
  /** Rules channel ID (for Community guilds), or null if none. */
  rulesChannelId: string | null;
  /** NSFW level for this guild. */
  nsfwLevel: GuildNSFWLevel;
  /** MFA level required for moderation actions. */
  mfaLevel: GuildMFALevel;
  /** Banner width in pixels. */
  bannerWidth?: number | null;
  /** Banner height in pixels. */
  bannerHeight?: number | null;
  /** Splash width in pixels. */
  splashWidth?: number | null;
  /** Splash height in pixels. */
  splashHeight?: number | null;
  /** Member manager for this guild (fetch/add/remove members). */
  members: GuildMemberManager;
  /** Cached channels in this guild. */
  channels = new Collection<string, GuildChannel>();
  /** Cached roles in this guild. */
  roles = new Collection<string, Role>();
  /** Cached emojis in this guild. */
  emojis = new Collection<string, GuildEmoji>();
  /** Cached stickers in this guild. */
  stickers = new Collection<string, GuildSticker>();

  /**
   * Construct a guild from API data.
   * @param data - API guild from GET /guilds/{id} or gateway GUILD_CREATE
   */
  constructor(client: Client, data: GuildData) {
    super();
    this.client = client;
    this.id = data.id;
    this.members = new GuildMemberManager(this);
    this.name = data.name;
    this.icon = data.icon ?? null;
    this.banner = data.banner ?? null;
    this.ownerId = data.owner_id ?? data.ownerId ?? '';
    this.splash = data.splash ?? null;
    this.vanityURLCode = data.vanity_url_code ?? null;
    this.features = data.features ?? [];
    this.verificationLevel = data.verification_level ?? 0;
    this.defaultMessageNotifications = data.default_message_notifications ?? 0;
    this.explicitContentFilter = data.explicit_content_filter ?? 0;
    this.afkChannelId = data.afk_channel_id ?? null;
    this.afkTimeout = data.afk_timeout ?? 0;
    this.systemChannelId = data.system_channel_id ?? null;
    this.rulesChannelId = data.rules_channel_id ?? null;
    this.nsfwLevel = data.nsfw_level ?? GuildNSFWLevel.Safe;
    this.mfaLevel = data.mfa_level ?? 0;
    this.bannerWidth = data.banner_width ?? null;
    this.bannerHeight = data.banner_height ?? null;
    this.splashWidth = data.splash_width ?? null;
    this.splashHeight = data.splash_height ?? null;
    for (const r of data.roles ?? []) {
      this.roles.set(r.id, new Role(client, r, this.id));
    }
  }

  /** Patch metadata in place; preserves members/channels/emojis/stickers caches. */
  _patch(data: GuildData): void {
    if (data.name !== undefined) this.name = data.name;
    if (data.icon !== undefined) this.icon = data.icon ?? null;
    if (data.banner !== undefined) this.banner = data.banner ?? null;
    if (data.owner_id !== undefined || data.ownerId !== undefined) {
      this.ownerId = data.owner_id ?? data.ownerId ?? this.ownerId;
    }
    if (data.splash !== undefined) this.splash = data.splash ?? null;
    if (data.vanity_url_code !== undefined) this.vanityURLCode = data.vanity_url_code ?? null;
    if (data.features !== undefined) this.features = data.features ?? [];
    if (data.verification_level !== undefined)
      this.verificationLevel = data.verification_level ?? 0;
    if (data.default_message_notifications !== undefined) {
      this.defaultMessageNotifications = data.default_message_notifications ?? 0;
    }
    if (data.explicit_content_filter !== undefined) {
      this.explicitContentFilter = data.explicit_content_filter ?? 0;
    }
    if (data.afk_channel_id !== undefined) this.afkChannelId = data.afk_channel_id ?? null;
    if (data.afk_timeout !== undefined) this.afkTimeout = data.afk_timeout ?? 0;
    if (data.system_channel_id !== undefined) this.systemChannelId = data.system_channel_id ?? null;
    if (data.rules_channel_id !== undefined) this.rulesChannelId = data.rules_channel_id ?? null;
    if (data.nsfw_level !== undefined) this.nsfwLevel = data.nsfw_level ?? GuildNSFWLevel.Safe;
    if (data.mfa_level !== undefined) this.mfaLevel = data.mfa_level ?? 0;
    if (data.banner_width !== undefined) this.bannerWidth = data.banner_width ?? null;
    if (data.banner_height !== undefined) this.bannerHeight = data.banner_height ?? null;
    if (data.splash_width !== undefined) this.splashWidth = data.splash_width ?? null;
    if (data.splash_height !== undefined) this.splashHeight = data.splash_height ?? null;
  }

  /** Get the full CDN URL for the guild's icon (or null). */
  iconURL(options?: { size?: number }): string | null {
    return cdnURL('icons', this.id, this.icon, options?.size, this.client.instance.endpoints.media);
  }

  /** Get the full CDN URL for the guild's banner (or null). */
  bannerURL(options?: { size?: number }): string | null {
    return cdnURL(
      'banners',
      this.id,
      this.banner,
      options?.size,
      this.client.instance.endpoints.media,
    );
  }

  /** Get the full CDN URL for the guild's invite splash (or null). */
  splashURL(options?: { size?: number }): string | null {
    return cdnURL(
      'splashes',
      this.id,
      this.splash,
      options?.size,
      this.client.instance.endpoints.media,
    );
  }

  /**
   * Create a channel. `data.type`: 0=text, 2=voice, 4=category, 998=link (set `url`).
   * Requires Manage Channels.
   */
  createChannel(data: ChannelCreateRequest): Promise<GuildChannel> {
    return channels.createChannel(this, data);
  }

  /** Fetch all channels in this guild from the API. */
  fetchChannels(): Promise<GuildChannel[]> {
    return channels.fetchChannels(this);
  }

  /** Update channel positions (reordering). */
  setChannelPositions(updates: ChannelPositionUpdate[]): Promise<void> {
    return channels.setChannelPositions(this, updates);
  }

  /** Fetch all webhooks in this guild. */
  fetchWebhooks(): Promise<Webhook[]> {
    return channels.fetchWebhooks(this);
  }

  /** Fetch all invites in this guild. Requires Manage Guild. */
  fetchInvites(): Promise<Invite[]> {
    return channels.fetchInvites(this);
  }

  /** Fetch a specific invite by code or URL. */
  fetchInvite(codeOrUrl: string): Promise<Invite> {
    return channels.fetchInvite(this, codeOrUrl);
  }

  /** Fetch a guild member by user ID. */
  fetchMember(userId: string): Promise<GuildMember> {
    return members.fetchMember(this, userId);
  }

  /** Fetch the bot's own member object in this guild. */
  fetchMe(): Promise<GuildMember> {
    return members.fetchMe(this);
  }

  /**
   * Create a role. `permissions` accepts a bitfield string or {@link PermissionResolvable}.
   * @example
   * await guild.createRole({ name: 'Mod', permissions: ['KickMembers', 'BanMembers'] });
   */
  createRole(options: RoleCreateOptions = {}): Promise<Role> {
    return roles.createRole(this, options);
  }

  /** Fetch all roles in this guild from the API. */
  fetchRoles(): Promise<Role[]> {
    return roles.fetchRoles(this);
  }

  /** Fetch a specific role by ID. */
  fetchRole(roleId: string): Promise<Role> {
    return roles.fetchRole(this, roleId);
  }

  /** Resolve role mention, snowflake, or name to a role ID. */
  resolveRoleId(arg: string): Promise<string | null> {
    return roles.resolveRoleId(this, arg);
  }

  /** Update role positions (reordering). Returns cached {@link Role} instances. */
  setRolePositions(updates: Array<{ id: string; position?: number }>): Promise<Role[]> {
    return roles.setRolePositions(this, updates);
  }

  /** Update role hoist positions (visual separator groups). Returns cached {@link Role} instances. */
  setRoleHoistPositions(updates: Array<{ id: string; hoistPosition?: number }>): Promise<Role[]> {
    return roles.setRoleHoistPositions(this, updates);
  }

  /** Reset all role hoist positions to zero. Returns cached {@link Role} instances. */
  resetRoleHoistPositions(): Promise<Role[]> {
    return roles.resetRoleHoistPositions(this);
  }

  /** Ban a user from the guild. Requires Ban Members. `ban_duration_seconds`: 0 = permanent. */
  ban(userId: string, options?: GuildBanOptions): Promise<void> {
    return moderation.ban(this, userId, options);
  }

  /** Fetch all bans in this guild. Requires Ban Members. */
  fetchBans(): Promise<GuildBan[]> {
    return moderation.fetchBans(this);
  }

  /** Unban a user from the guild. Requires Ban Members. */
  unban(userId: string): Promise<void> {
    return moderation.unban(this, userId);
  }

  /** Kick a user from the guild. Requires Kick Members. */
  kick(userId: string): Promise<void> {
    return moderation.kick(this, userId);
  }

  /** Fetch all emojis in this guild from the API. */
  fetchEmojis(): Promise<GuildEmoji[]> {
    return emojis.fetchEmojis(this);
  }

  /** Fetch a specific emoji by ID. */
  fetchEmoji(emojiId: string): Promise<GuildEmoji> {
    return emojis.fetchEmoji(this, emojiId);
  }

  /** Create a new emoji in this guild. Requires Manage Emojis and Stickers. */
  createEmoji(options: { name: string; image: string }): Promise<GuildEmoji> {
    return emojis.createEmoji(this, options);
  }

  /** Clone an emoji from another guild. Requires Manage Emojis and Stickers. */
  cloneEmoji(sourceEmojiId: string): Promise<GuildEmoji> {
    return emojis.cloneEmoji(this, sourceEmojiId);
  }

  /** Create multiple emojis at once (bulk operation). */
  createEmojisBulk(
    emojiList: Array<{ name: string; image: string }>,
  ): Promise<{ success: GuildEmoji[]; failed: Array<{ name: string; error: string }> }> {
    return emojis.createEmojisBulk(this, emojiList);
  }

  /** Create a new sticker in this guild. Requires Manage Emojis and Stickers. */
  createSticker(options: {
    name: string;
    image: string;
    description?: string | null;
    tags?: string[];
  }): Promise<GuildSticker> {
    return stickers.createSticker(this, options);
  }

  /** Clone a sticker from another guild. Requires Manage Emojis and Stickers. */
  cloneSticker(sourceStickerId: string): Promise<GuildSticker> {
    return stickers.cloneSticker(this, sourceStickerId);
  }

  /** Create multiple stickers at once (bulk operation). */
  createStickersBulk(
    stickerList: Array<{ name: string; image: string; description?: string; tags?: string[] }>,
  ): Promise<{ success: GuildSticker[]; failed: Array<{ name: string; error: string }> }> {
    return stickers.createStickersBulk(this, stickerList);
  }

  /** Fetch all stickers in this guild from the API. */
  fetchStickers(): Promise<GuildSticker[]> {
    return stickers.fetchStickers(this);
  }

  /** Fetch a specific sticker by ID. */
  fetchSticker(stickerId: string): Promise<GuildSticker> {
    return stickers.fetchSticker(this, stickerId);
  }

  /** Fetch audit log entries. Requires View Audit Log. */
  fetchAuditLogs(options?: {
    limit?: number;
    before?: string;
    after?: string;
    userId?: string;
    actionType?: AuditLogActionType;
  }): Promise<AuditLogFetchPayload> {
    return admin.fetchAuditLogs(this, options);
  }

  /** Edit guild settings. Requires guild owner or Administrator. */
  edit(options: GuildEditOptions): Promise<this> {
    return admin.editGuild(this, options) as Promise<this>;
  }

  /** Fetch the guild's vanity invite URL (if available). */
  fetchVanityURL(): Promise<VanityURLPayload> {
    return admin.fetchVanityURL(this);
  }

  /** Edit the guild's vanity invite code. */
  editVanityURL(code: string | null): Promise<VanityURLPayload> {
    return admin.editVanityURL(this, code);
  }

  /** Fetch the guild's discovery status. */
  fetchDiscoveryStatus(): Promise<DiscoveryStatusPayload> {
    return admin.fetchDiscoveryStatus(this);
  }

  /** Apply for guild discovery. */
  applyForDiscovery(body: DiscoveryApplicationOptions): Promise<DiscoveryApplicationPayload> {
    return admin.applyForDiscovery(this, body);
  }

  /** Edit an existing discovery application. */
  editDiscoveryApplication(
    body: DiscoveryApplicationOptions,
  ): Promise<DiscoveryApplicationPayload> {
    return admin.editDiscoveryApplication(this, body);
  }

  /** Withdraw the guild's discovery application. */
  withdrawDiscoveryApplication(): Promise<void> {
    return admin.withdrawDiscoveryApplication(this);
  }

  /** Delete this guild (owner only). User accounts may need sudo/MFA in `options`. */
  delete(options?: SudoVerificationOptions): Promise<void> {
    return admin.deleteGuild(this, options);
  }

  /** Transfer guild ownership to another user (owner only). */
  transferOwnership(newOwnerId: string, password?: string): Promise<void> {
    return admin.transferOwnership(this, newOwnerId, password);
  }
}
