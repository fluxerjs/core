import { Client } from '../client/Client.js';
import { Base } from './Base.js';
import { User } from './User.js';
import { Guild } from './Guild.js';
import { GuildChannel } from './Channel.js';
import { APIGuildMember } from '@fluxerjs/types';
import {
  BitField,
  PermissionFlags
} from '@fluxerjs/util';
import { Routes } from '@fluxerjs/types';
import { cdnMemberAvatarURL, cdnMemberBannerURL } from '../util/cdn.js';
import { computePermissions } from '../util/permissions.js';
import { GuildMemberRoleManager } from './GuildMemberRoleManager.js';

/** Represents a member of a guild. */
export class GuildMember extends Base {
  readonly client: Client;
  readonly id: string;
  readonly user: User;
  readonly guild: Guild;
  nick: string | null;
  /**
   * Role manager with add/remove/set and cache. Discord.js parity: member.roles.add(), member.roles.cache
   * @discordJsCompat https://discord.js.org/docs/packages/discord.js/main/GuildMemberRoleManager
   */
  readonly roles: GuildMemberRoleManager;
  readonly joinedAt: Date;
  communicationDisabledUntil: Date | null;
  readonly mute: boolean;
  readonly deaf: boolean;
  readonly avatar: string | null;
  readonly banner: string | null;
  readonly accentColor: number | null;
  readonly profileFlags: number | null;

  /** @param data - API guild member from GET /guilds/{id}/members or GET /guilds/{id}/members/{user_id} */
  constructor(client: Client, data: APIGuildMember & { guild_id?: string }, guild: Guild) {
    super();
    this.client = client;
    this.user = client.getOrCreateUser(data.user);
    this.id = data.user.id;
    this.guild = guild;
    this.nick = data.nick ?? null;
    this.roles = new GuildMemberRoleManager(this, data.roles ?? []);
    this.joinedAt = new Date(data.joined_at);
    this.communicationDisabledUntil = data.communication_disabled_until
      ? new Date(data.communication_disabled_until)
      : null;
    this.mute = data.mute ?? false;
    this.deaf = data.deaf ?? false;
    this.avatar = data.avatar ?? null;
    this.banner = data.banner ?? null;
    this.accentColor = data.accent_color ?? null;
    this.profileFlags = data.profile_flags ?? null;
  }

  /** Nickname, or global name, or username. */
  get displayName(): string {
    return this.nick ?? this.user.globalName ?? this.user.username;
  }

  /**
   * Get the guild-specific avatar URL for this member.
   * Returns null if the member has no guild avatar (use displayAvatarURL for fallback).
   */
  avatarURL(options?: { size?: number; extension?: string }): string | null {
    return cdnMemberAvatarURL(this.guild.id, this.id, this.avatar, options);
  }

  /**
   * Get the avatar URL to display for this member.
   * Uses guild-specific avatar if set, otherwise falls back to the user's avatar.
   */
  displayAvatarURL(options?: { size?: number; extension?: string }): string {
    return this.avatarURL(options) ?? this.user.displayAvatarURL(options);
  }

  /**
   * Get the guild-specific banner URL for this member.
   * Returns null if the member has no guild banner.
   */
  bannerURL(options?: { size?: number; extension?: string }): string | null {
    return cdnMemberBannerURL(this.guild.id, this.id, this.banner, options);
  }

  /**
   * Add a role to this member.
   * Prefer member.roles.add(roleId) for Discord.js parity.
   * @param roleId - The role ID to add
   * Requires Manage Roles permission.
   */
  async addRole(roleId: string): Promise<void> {
    await this.roles.add(roleId);
  }

  /**
   * Remove a role from this member.
   * Prefer member.roles.remove(roleId) for Discord.js parity.
   * @param roleId - The role ID to remove
   * Requires Manage Roles permission.
   */
  async removeRole(roleId: string): Promise<void> {
    await this.roles.remove(roleId);
  }

  /**
   * Edit this guild member. PATCH /guilds/{id}/members/{userId} or /members/@me for the bot.
   * For @me: nick, avatar, banner, bio, pronouns, accent_color, profile_flags, mute, deaf,
   * communication_disabled_until, timeout_reason, channel_id, connection_id.
   * For other members: same plus roles (array of role IDs).
   */
  async edit(options: {
    nick?: string | null;
    roles?: string[];
    avatar?: string | null;
    banner?: string | null;
    bio?: string | null;
    pronouns?: string | null;
    accent_color?: number | null;
    profile_flags?: number | null;
    mute?: boolean;
    deaf?: boolean;
    communication_disabled_until?: string | null;
    timeout_reason?: string | null;
    channel_id?: string | null;
    connection_id?: string | null;
  }): Promise<this> {
    const isMe = this.client.user?.id === this.id;
    const route = isMe
      ? `/guilds/${this.guild.id}/members/@me`
      : Routes.guildMember(this.guild.id, this.id);
    const data = await this.client.rest.patch<APIGuildMember>(route, {
      body: options,
      auth: true,
    });
    this.nick = data.nick ?? this.nick;
    if (data.roles) this.roles._patch(data.roles);
    if (data.communication_disabled_until != null) {
      (this as { communicationDisabledUntil: Date | null }).communicationDisabledUntil =
        data.communication_disabled_until ? new Date(data.communication_disabled_until) : null;
    }
    return this;
  }

  /**
   * Get the member's guild-level permissions (from roles only, no channel overwrites).
   * Use this for server-wide permission checks (e.g. ban, kick, manage roles).
   * @returns Object with has(permission) to check specific permissions
   * @example
   * const perms = member.permissions;
   * if (perms.has(PermissionFlags.BanMembers)) { ... }
   */
  get permissions() {
    const base = this._computeBasePermissions();
    const ownerId = this.guild.ownerId;
    const isOwner = ownerId != null && ownerId !== '' && String(ownerId) === String(this.id);
    const perms = computePermissions(base, [], [], this.id, isOwner);
    return new BitField<keyof typeof PermissionFlags>(perms);
  }

  /**
   * Compute the member's effective permissions in a guild channel.
   * Applies role permissions and channel overwrites.
   * @param channel - The guild channel to check permissions for
   * @returns Object with has(permission) to check specific permissions
   * @example
   * const perms = member.permissionsIn(channel);
   * if (perms.has(PermissionFlags.SendMessages)) { ... }
   */
  permissionsIn(channel: GuildChannel) {
    const base = this._computeBasePermissions();
    const ownerId = this.guild.ownerId;
    const isOwner = ownerId != null && ownerId !== '' && String(ownerId) === String(this.id);
    const perms = computePermissions(
      base,
      channel.permissionOverwrites,
      [...this.roles.roleIds],
      this.id,
      isOwner,
    );
    return new BitField<keyof typeof PermissionFlags>(perms);
  }

  private _computeBasePermissions(): bigint {
    let base = 0n;
    const everyone = this.guild.roles.get(this.guild.id);
    if (everyone) base |= everyone.permissions.bitfield;
    for (const roleId of this.roles.roleIds) {
      if (roleId === this.guild.id) continue;
      const role = this.guild.roles.get(roleId);
      if (role) base |= role.permissions.bitfield;
    }
    return base;
  }
}
