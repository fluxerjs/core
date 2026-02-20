import {
  parseRoleMention,
  resolvePermissionsToBitfield,
  type PermissionResolvable,
} from '@fluxerjs/util';
import { FluxerAPIError } from '@fluxerjs/rest';
import { Client } from '../client/Client.js';
import { Collection } from '@fluxerjs/collection';
import { Base } from './Base.js';
import { FluxerError } from '../errors/FluxerError.js';
import { ErrorCodes } from '../errors/ErrorCodes.js';
import {
  APIGuild,
  APIGuildAuditLog,
  APIGuildMember,
  APIRole,
  APIVanityURL,
  RESTCreateRoleBody,
  GuildFeature,
  GuildVerificationLevel,
  GuildMFALevel,
  GuildExplicitContentFilter,
  DefaultMessageNotifications, APIBan, APIChannel, APIEmoji, APISticker,
} from '@fluxerjs/types';
import { GuildMemberManager } from '../client/GuildMemberManager.js';
import { GuildMember } from './GuildMember.js';
import { Role } from './Role.js';
import  { Channel, GuildChannel } from './Channel.js';
import { CDN_URL } from '../util/Constants.js';
import { Routes } from '@fluxerjs/types';
import { Webhook } from './Webhook.js';
import { GuildBan } from './GuildBan.js';
import { GuildEmoji } from './GuildEmoji';
import { GuildSticker } from './GuildSticker';

/** Represents a Fluxer guild (server). */
export class Guild extends Base {
  readonly client: Client;
  readonly id: string;
  name: string;
  icon: string | null;
  banner: string | null;
  readonly ownerId: string;
  /** Invite splash image hash. Null if none. */
  splash: string | null;
  /** Custom vanity URL code (e.g. fluxer.gg/code). Null if none. */
  vanityURLCode: string | null;
  /** Enabled guild features. */
  features: GuildFeature[];
  verificationLevel: GuildVerificationLevel;
  defaultMessageNotifications: DefaultMessageNotifications;
  explicitContentFilter: GuildExplicitContentFilter;
  /** AFK voice channel ID. Null if none. */
  afkChannelId: string | null;
  /** AFK timeout in seconds. */
  afkTimeout: number;
  /** System messages channel ID. Null if none. */
  systemChannelId: string | null;
  /** Rules/guidelines channel ID. Null if none. */
  rulesChannelId: string | null;
  nsfwLevel: number;
  mfaLevel: GuildMFALevel;
  /** Banner image width. Optional. */
  bannerWidth?: number | null;
  /** Banner image height. Optional. */
  bannerHeight?: number | null;
  /** Splash image width. Optional. */
  splashWidth?: number | null;
  /** Splash image height. Optional. */
  splashHeight?: number | null;
  members: GuildMemberManager;
  channels = new Collection<string, GuildChannel>();
  roles = new Collection<string, Role>();

  /** @param data - API guild from GET /guilds/{id} or gateway GUILD_CREATE */
  constructor(client: Client, data: APIGuild & { roles?: APIRole[]; ownerId?: string }) {
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
    this.nsfwLevel = data.nsfw_level ?? 0;
    this.mfaLevel = data.mfa_level ?? 0;
    this.bannerWidth = data.banner_width ?? null;
    this.bannerHeight = data.banner_height ?? null;
    this.splashWidth = data.splash_width ?? null;
    this.splashHeight = data.splash_height ?? null;
    for (const r of data.roles ?? []) {
      this.roles.set(r.id, new Role(client, r, this.id));
    }
  }

  /** Get the guild icon URL, or null if no icon. */
  iconURL(options?: { size?: number }): string | null {
    if (!this.icon) return null;
    const size = options?.size ? `?size=${options.size}` : '';
    return `${CDN_URL}/icons/${this.id}/${this.icon}.png${size}`;
  }

  /** Get the guild banner URL, or null if no banner. */
  bannerURL(options?: { size?: number }): string | null {
    if (!this.banner) return null;
    const size = options?.size ? `?size=${options.size}` : '';
    return `${CDN_URL}/banners/${this.id}/${this.banner}.png${size}`;
  }

  /** Get the guild splash (invite background) URL, or null if no splash. */
  splashURL(options?: { size?: number }): string | null {
    if (!this.splash) return null;
    const size = options?.size ? `?size=${options.size}` : '';
    return `${CDN_URL}/splashes/${this.id}/${this.splash}.png${size}`;
  }

  /**
   * Add a role to a member by user ID. Does not require fetching the member first.
   * @param userId - The user ID of the member
   * @param roleId - The role ID to add (or use guild.resolveRoleId for mention/name resolution)
   * Requires Manage Roles permission.
   */
  async addRoleToMember(userId: string, roleId: string): Promise<void> {
    await this.client.rest.put(Routes.guildMemberRole(this.id, userId, roleId));
  }

  /**
   * Remove a role from a member by user ID. Does not require fetching the member first.
   * @param userId - The user ID of the member
   * @param roleId - The role ID to remove
   * Requires Manage Roles permission.
   */
  async removeRoleFromMember(userId: string, roleId: string): Promise<void> {
    await this.client.rest.delete(Routes.guildMemberRole(this.id, userId, roleId));
  }

  /**
   * Create a role in this guild.
   * Requires Manage Roles permission.
   * @param options - Role data (permissions accepts PermissionResolvable for convenience)
   * @returns The created role
   * @example
   * const role = await guild.createRole({ name: 'Mod', permissions: ['KickMembers', 'BanMembers'] });
   */
  async createRole(
    options: RESTCreateRoleBody & { permissions?: string | PermissionResolvable },
  ): Promise<Role> {
    const body: Record<string, unknown> = {};
    if (options.name !== undefined) body.name = options.name;
    if (options.permissions !== undefined) {
      body.permissions =
        typeof options.permissions === 'string'
          ? options.permissions
          : resolvePermissionsToBitfield(options.permissions);
    }
    if (options.color !== undefined) body.color = options.color;
    if (options.hoist !== undefined) body.hoist = options.hoist;
    if (options.mentionable !== undefined) body.mentionable = options.mentionable;
    if (options.unicode_emoji !== undefined) body.unicode_emoji = options.unicode_emoji;
    if (options.position !== undefined) body.position = options.position;
    if (options.hoist_position !== undefined) body.hoist_position = options.hoist_position;
    const data = await this.client.rest.post<APIRole>(Routes.guildRoles(this.id), {
      body: Object.keys(body).length ? body : undefined,
      auth: true,
    });
    const role = new Role(this.client, data, this.id);
    this.roles.set(role.id, role);
    return role;
  }

  /**
   * Fetch all roles in this guild.
   * @returns Array of Role objects (cached in guild.roles)
   */
  async fetchRoles(): Promise<Role[]> {
    const data = await this.client.rest.get<APIRole[] | Record<string, APIRole>>(
      Routes.guildRoles(this.id),
    );
    const list = Array.isArray(data) ? data : Object.values(data ?? {});
    const roles: Role[] = [];
    for (const r of list) {
      const role = new Role(this.client, r, this.id);
      this.roles.set(role.id, role);
      roles.push(role);
    }
    return roles;
  }

  /**
   * Fetch a role by ID.
   * @param roleId - The role ID to fetch
   * @returns The role
   * @throws FluxerError with ROLE_NOT_FOUND if role does not exist (404)
   */
  async fetchRole(roleId: string): Promise<Role> {
    try {
      const data = await this.client.rest.get<APIRole>(Routes.guildRole(this.id, roleId));
      const role = new Role(this.client, data, this.id);
      this.roles.set(role.id, role);
      return role;
    } catch (err) {
      const statusCode =
        err instanceof FluxerAPIError
          ? err.statusCode
          : (err as { statusCode?: number })?.statusCode;
      if (statusCode === 404) {
        throw new FluxerError(`Role ${roleId} not found in guild`, {
          code: ErrorCodes.RoleNotFound,
          cause: err as Error,
        });
      }
      throw err instanceof FluxerError
        ? err
        : new FluxerError('Failed to fetch guild role', { cause: err as Error });
    }
  }

  /**
   * Resolve a role ID from an argument (role mention, raw ID, or name).
   * Fetches guild roles if name is provided.
   * @param arg - Role mention (@role), role ID, or role name
   * @returns The role ID, or null if not found
   */
  async resolveRoleId(arg: string): Promise<string | null> {
    const parsed = parseRoleMention(arg);
    if (parsed) return parsed;
    if (/^\d{17,19}$/.test(arg.trim())) return arg.trim();
    const cached = this.roles.find(
      (r) => !!(r.name && r.name.toLowerCase() === arg.trim().toLowerCase()),
    );
    if (cached) return cached.id;
    const roles = await this.client.rest.get(Routes.guildRoles(this.id));
    const list = (Array.isArray(roles) ? roles : Object.values(roles ?? {})) as Array<APIRole>;
    const role = list.find((r) => !!(r.name && r.name.toLowerCase() === arg.trim().toLowerCase()));
    if (role) {
      this.roles.set(role.id, new Role(this.client, role, this.id));
      return role.id;
    }
    return null;
  }

  /**
   * Ban a user from this guild.
   * @param userId - The user ID to ban
   * @param options - Optional reason, delete_message_days (0–7), and ban_duration_seconds (temporary ban).
   *   ban_duration_seconds: 0 = permanent, or use 3600, 43200, 86400, 259200, 432000, 604800, 1209600, 2592000.
   * Requires Ban Members permission.
   */
  async ban(
    userId: string,
    options?: { reason?: string; delete_message_days?: number; ban_duration_seconds?: number },
  ): Promise<void> {
    const body: Record<string, unknown> = {};
    if (options?.reason) body.reason = options.reason;
    if (options?.delete_message_days != null)
      body.delete_message_days = options.delete_message_days;
    if (options?.ban_duration_seconds != null)
      body.ban_duration_seconds = options.ban_duration_seconds;
    await this.client.rest.put(Routes.guildBan(this.id, userId), {
      body: Object.keys(body).length ? body : undefined,
      auth: true,
    });
  }

  /**
   * Fetch guild bans. Requires Ban Members permission.
   * @returns List of GuildBan objects
   */
  async fetchBans(): Promise<GuildBan[]> {
    const data = await this.client.rest.get<
      APIBan[] | { bans?: APIBan[] }
    >(Routes.guildBans(this.id));
    const list = Array.isArray(data) ? data : (data?.bans ?? []);
    return list.map((b) => new GuildBan(this.client, { ...b, guild_id: this.id }, this.id));
  }

  /**
   * Remove a ban (unban a user).
   * @param userId - The user ID to unban
   * Requires Ban Members permission.
   */
  async unban(userId: string): Promise<void> {
    await this.client.rest.delete(Routes.guildBan(this.id, userId), { auth: true });
  }

  /**
   * Kick a member from this guild.
   * @param userId - The user ID to kick
   * Requires Kick Members permission.
   */
  async kick(userId: string): Promise<void> {
    await this.client.rest.delete(Routes.guildMember(this.id, userId), { auth: true });
  }

  /**
   * Fetch a guild member by user ID.
   * @param userId - The user ID of the member to fetch
   * @returns The guild member
   * @throws FluxerError with MEMBER_NOT_FOUND if user is not in the guild (404)
   * @throws FluxerError with cause for permission denied (403) or other REST errors
   */
  async fetchMember(userId: string): Promise<GuildMember> {
    try {
      const data = await this.client.rest.get<APIGuildMember & { user: { id: string } }>(
        Routes.guildMember(this.id, userId),
      );
      const member = new GuildMember(this.client, { ...data, guild_id: this.id }, this);
      this.members.set(member.id, member);
      return member;
    } catch (err) {
      const statusCode =
        err instanceof FluxerAPIError
          ? err.statusCode
          : (err as { statusCode?: number })?.statusCode;
      if (statusCode === 404) {
        throw new FluxerError(`Member ${userId} not found in guild`, {
          code: ErrorCodes.MemberNotFound,
          cause: err as Error,
        });
      }
      throw err instanceof FluxerError
        ? err
        : new FluxerError('Failed to fetch guild member', { cause: err as Error });
    }
  }

  /**
   * Fetch guild audit logs. Requires View Audit Log permission.
   * @param options - Optional limit, before, after, user_id, action_type for filtering
   */
  async fetchAuditLogs(options?: {
    limit?: number;
    before?: string;
    after?: string;
    userId?: string;
    actionType?: number;
  }): Promise<APIGuildAuditLog> {
    const params = new URLSearchParams();
    if (options?.limit != null) params.set('limit', String(options.limit));
    if (options?.before) params.set('before', options.before);
    if (options?.after) params.set('after', options.after);
    if (options?.userId) params.set('user_id', options.userId);
    if (options?.actionType != null) params.set('action_type', String(options.actionType));
    const qs = params.toString();
    const url = Routes.guildAuditLogs(this.id) + (qs ? `?${qs}` : '');
    return this.client.rest.get(url) as Promise<APIGuildAuditLog>;
  }

  /** Fetch all webhooks in this guild. Returned webhooks do not include the token (cannot send). */
  async fetchWebhooks(): Promise<Webhook[]> {
    const data = await this.client.rest.get(Routes.guildWebhooks(this.id));
    const list = Array.isArray(data) ? data : Object.values(data ?? {});
    return list.map((w) => new Webhook(this.client, w));
  }

  /**
   * Create a channel in this guild.
   * @param data - Channel data: type (0=text, 2=voice, 4=category, 5=link), name, and optional parent_id, topic, bitrate, user_limit, nsfw, permission_overwrites
   * Requires Manage Channels permission.
   */
  async createChannel(data: {
    type: 0 | 2 | 4 | 5;
    name: string;
    parent_id?: string | null;
    topic?: string | null;
    bitrate?: number | null;
    user_limit?: number | null;
    nsfw?: boolean;
    permission_overwrites?: Array<{ id: string; type: number; allow: string; deny: string }>;
  }): Promise<GuildChannel> {
    const created = await this.client.rest.post(Routes.guildChannels(this.id), {
      body: data,
      auth: true,
    });
    const channel = Channel.from(this.client, created as APIChannel);
    if (channel) {
      this.client.channels.set(channel.id, channel);
      this.channels.set(channel.id, channel as GuildChannel);
    }
    return channel as GuildChannel;
  }

  /**
   * Fetch all channels in this guild.
   * @returns Array of GuildChannel objects (cached in guild.channels and client.channels)
   */
  async fetchChannels(): Promise<GuildChannel[]> {
    const data = await this.client.rest.get(Routes.guildChannels(this.id));
    const list = Array.isArray(data) ? data : Object.values(data ?? {});
    const channels: GuildChannel[] = [];
    for (const ch of list) {
      const channel = Channel.from(this.client, ch as APIChannel);
      if (channel) {
        this.client.channels.set(channel.id, channel);
        this.channels.set(channel.id, channel as GuildChannel);
        channels.push(channel as GuildChannel);
      }
    }
    return channels;
  }

  /**
   * Edit this guild. PATCH /guilds/{id}.
   * Requires guild owner or Administrator.
   */
  async edit(options: {
    name?: string;
    icon?: string | null;
    system_channel_id?: string | null;
    system_channel_flags?: number;
    afk_channel_id?: string | null;
    afk_timeout?: number;
    default_message_notifications?: DefaultMessageNotifications;
    verification_level?: GuildVerificationLevel;
    mfa_level?: GuildMFALevel;
    explicit_content_filter?: GuildExplicitContentFilter;
    banner?: string | null;
    splash?: string | null;
    embed_splash?: string | null;
    splash_card_alignment?: string;
    features?: GuildFeature[];
  }): Promise<this> {
    const data = await this.client.rest.patch<APIGuild>(Routes.guild(this.id), {
      body: options,
      auth: true,
    });
    this.name = data.name;
    this.icon = data.icon ?? this.icon;
    this.banner = data.banner ?? this.banner;
    this.splash = data.splash ?? this.splash;
    this.systemChannelId = data.system_channel_id ?? this.systemChannelId;
    this.afkChannelId = data.afk_channel_id ?? this.afkChannelId;
    this.afkTimeout = data.afk_timeout ?? this.afkTimeout;
    this.verificationLevel = data.verification_level ?? this.verificationLevel;
    this.mfaLevel = data.mfa_level ?? this.mfaLevel;
    this.explicitContentFilter = data.explicit_content_filter ?? this.explicitContentFilter;
    this.defaultMessageNotifications =
      data.default_message_notifications ?? this.defaultMessageNotifications;
    this.features = data.features ?? this.features;
    return this;
  }

  /**
   * Delete this guild. POST /guilds/{id}/delete.
   * Must be the guild owner.
   */
  async delete(): Promise<void> {
    await this.client.rest.post(Routes.guildDelete(this.id), { auth: true });
    this.client.guilds.delete(this.id);
  }

  /**
   * Fetch vanity URL for this guild. GET /guilds/{id}/vanity-url.
   * Requires Manage Guild permission.
   */
  async fetchVanityURL(): Promise<APIVanityURL> {
    return this.client.rest.get<APIVanityURL>(Routes.guildVanityUrl(this.id), { auth: true });
  }

  /**
   * Transfer guild ownership to another user. POST /guilds/{id}/transfer-ownership.
   * Must be the guild owner.
   */
  async transferOwnership(newOwnerId: string, password?: string): Promise<void> {
    await this.client.rest.post(Routes.guildTransferOwnership(this.id), {
      body: { new_owner_id: newOwnerId, ...(password != null && { password }) },
      auth: true,
    });
  }

  /**
   * Set text channel flexible names feature. PATCH /guilds/{id}/text-channel-flexible-names.
   */
  setTextChannelFlexibleNames(enabled: boolean): Promise<this> {
    return this.client.rest
      .patch<APIGuild>(Routes.guildTextChannelFlexibleNames(this.id), {
        body: { enabled },
        auth: true,
      })
      .then(() => this);
  }

  /**
   * Set detached banner feature. PATCH /guilds/{id}/detached-banner.
   */
  setDetachedBanner(enabled: boolean): Promise<this> {
    return this.client.rest
      .patch<APIGuild>(Routes.guildDetachedBanner(this.id), {
        body: { enabled },
        auth: true,
      })
      .then(() => this);
  }

  /**
   * Set disallow unclaimed accounts. PATCH /guilds/{id}/disallow-unclaimed-accounts.
   */
  setDisallowUnclaimedAccounts(enabled: boolean): Promise<this> {
    return this.client.rest
      .patch<APIGuild>(Routes.guildDisallowUnclaimedAccounts(this.id), {
        body: { enabled },
        auth: true,
      })
      .then(() => this);
  }

  /**
   * Update role positions. PATCH /guilds/{id}/roles.
   * @param updates - Array of { id, position? }
   */
  async setRolePositions(updates: Array<{ id: string; position?: number }>): Promise<APIRole[]> {
    const data = await this.client.rest.patch<APIRole[] | Record<string, APIRole>>(
      Routes.guildRoles(this.id),
      { body: updates, auth: true },
    );
    const list = Array.isArray(data) ? data : Object.values(data ?? {});
    for (const r of list) {
      this.roles.set(r.id, new Role(this.client, r, this.id));
    }
    return list as APIRole[];
  }

  /**
   * Update role hoist positions. PATCH /guilds/{id}/roles/hoist-positions.
   */
  async setRoleHoistPositions(
    updates: Array<{ id: string; hoist_position?: number }>,
  ): Promise<APIRole[]> {
    const data = await this.client.rest.patch<APIRole[] | Record<string, APIRole>>(
      Routes.guildRolesHoistPositions(this.id),
      { body: updates, auth: true },
    );
    const list = Array.isArray(data) ? data : Object.values(data ?? {});
    for (const r of list) {
      this.roles.set(r.id, new Role(this.client, r, this.id));
    }
    return list as APIRole[];
  }

  /**
   * Reset role hoist positions. DELETE /guilds/{id}/roles/hoist-positions.
   */
  async resetRoleHoistPositions(): Promise<APIRole[]> {
    const data = await this.client.rest.delete<APIRole[] | Record<string, APIRole>>(
      Routes.guildRolesHoistPositions(this.id),
      { auth: true },
    );
    const list = Array.isArray(data) ? data : Object.values(data ?? {});
    for (const r of list) {
      this.roles.set(r.id, new Role(this.client, r, this.id));
    }
    return list as APIRole[];
  }

  /**
   * Update channel positions.
   * @param updates - Array of { id, position?, parent_id?, lock_permissions? }
   * Requires Manage Channels permission.
   */
  async setChannelPositions(
    updates: Array<{
      id: string;
      position?: number;
      parent_id?: string | null;
      lock_permissions?: boolean;
    }>,
  ): Promise<void> {
    await this.client.rest.patch(Routes.guildChannels(this.id), {
      body: updates,
      auth: true,
    });
  }

  /**
   * Bulk create emojis. POST /guilds/{id}/emojis/bulk.
   * @param emojis - Array of { name, image } (base64), 1-50 emojis
   * @returns Array of created GuildEmoji objects
   */
  async createEmojisBulk(
    emojis: Array<{ name: string; image: string }>,
  ): Promise<GuildEmoji[]> {
    const data = await this.client.rest.post<
      APIEmoji[] | { emojis?: APIEmoji[] }
    >(Routes.guildEmojisBulk(this.id), {
      body: { emojis },
      auth: true,
    });
    const list = Array.isArray(data) ? data : (data?.emojis ?? []);
    return list.map((e) => new GuildEmoji(this.client, { ...e, guild_id: this.id }, this.id));
  }

  /**
   * Bulk create stickers. POST /guilds/{id}/stickers/bulk.
   * @param stickers - Array of { name, image, description?, tags? }, 1-50 stickers
   * @returns Array of created GuildSticker objects
   */
  async createStickersBulk(
    stickers: Array<{
      name: string;
      image: string;
      description?: string;
      tags?: string[];
    }>,
  ): Promise<GuildSticker[]> {
    const data = await this.client.rest.post<
      APISticker[] | { stickers?: APISticker[] }
    >(Routes.guildStickersBulk(this.id), {
      body: { stickers },
      auth: true,
    });
    const list = Array.isArray(data) ? data : (data?.stickers ?? []);
    return list.map((s) => new GuildSticker(this.client, { ...s, guild_id: this.id }, this.id));
  }
}
