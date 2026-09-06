import type { APIChannelOverwrite, APIGuildMember } from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';
import { PermissionFlags, PermissionsBitField } from '@fluxerjs/util';

import type { Client } from '../../ClientCore/Client.js';
import {
  type GuildMemberEditOptions,
  toMemberEditBody,
} from '../../ClientCore/SdkOptions/index.js';
import { cdnMemberAvatarURL, cdnMemberBannerURL } from '../../Helpers/Cdn.js';
import { computePermissions } from '../../Helpers/Permissions.js';
import { Base } from '../Base.js';
import type { GuildChannel } from '../Channel/index.js';
import type { User } from '../User.js';
import type { Guild } from './Guild.js';
import { GuildMemberRoleManager } from './GuildMemberRoleManager.js';
import type { GuildBanOptions } from './Types.js';

/** Member payload plus fields that exist on update/edit but not always on GET. */
type GuildMemberData = APIGuildMember & {
  guild_id?: string;
  bio?: string | null;
  pronouns?: string | null;
};

/**
 * Guild member — roles via {@link GuildMember.roles}, permissions via {@link permissions} / {@link permissionsIn}.
 * Cached per guild in {@link Guild.members}.
 */
export class GuildMember extends Base {
  /** Discriminant vs {@link PartialGuildMember}: always `false` on a hydrated member. */
  readonly partial = false as const;
  /** Parent client instance. */
  readonly client: Client;
  /** User ID (same as `user.id`). */
  readonly id: string;
  /** The underlying {@link User}. */
  readonly user: User;
  /** The guild this member belongs to. */
  readonly guild: Guild;
  /** Guild-specific nickname (null = use global name or username). */
  nick: string | null;
  /** Role manager for this member. */
  readonly roles: GuildMemberRoleManager;
  /** When this member joined the guild. */
  readonly joinedAt: Date;
  /** Timeout end date (null = not timed out). */
  communicationDisabledUntil: Date | null;
  /** Whether this member is voice-muted. */
  mute: boolean;
  /** Whether this member is voice-deafened. */
  deaf: boolean;
  /** Guild-specific avatar hash (null = use user avatar). */
  avatar: string | null;
  /** Guild-specific banner hash. */
  banner: string | null;
  /** Guild-specific accent color (24-bit RGB). */
  accentColor: number | null;
  /** Guild-specific profile flags. */
  profileFlags: number | null;
  /** Per-guild reply mention preference override. */
  mentionFlags: number | null;
  /** Guild-specific bio (set from member edit; not always on GET member). */
  bio: string | null;
  /** Guild-specific pronouns (set from member edit; not always on GET member). */
  pronouns: string | null;

  constructor(client: Client, data: GuildMemberData, guild: Guild) {
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
    this.mentionFlags = data.mention_flags ?? null;
    this.bio = data.bio ?? null;
    this.pronouns = data.pronouns ?? null;
  }

  /**
   * Apply an API member payload in place (gateway GUILD_MEMBER_UPDATE / REST edit).
   * @internal
   */
  _patch(data: GuildMemberData): void {
    if (data.user) this.client.getOrCreateUser(data.user);
    if (data.nick !== undefined) this.nick = data.nick ?? null;
    if (data.roles) this.roles._patch(data.roles);
    if (data.communication_disabled_until !== undefined) {
      this.communicationDisabledUntil = data.communication_disabled_until
        ? new Date(data.communication_disabled_until)
        : null;
    }
    if (data.mute !== undefined) this.mute = data.mute ?? false;
    if (data.deaf !== undefined) this.deaf = data.deaf ?? false;
    if (data.avatar !== undefined) this.avatar = data.avatar ?? null;
    if (data.banner !== undefined) this.banner = data.banner ?? null;
    if (data.accent_color !== undefined) this.accentColor = data.accent_color ?? null;
    if (data.profile_flags !== undefined) this.profileFlags = data.profile_flags ?? null;
    if (data.mention_flags !== undefined) this.mentionFlags = data.mention_flags ?? null;
    if (data.bio !== undefined) this.bio = data.bio ?? null;
    if (data.pronouns !== undefined) this.pronouns = data.pronouns ?? null;
  }

  /**
   * Snapshot for `guildMemberUpdate` old-member arg (before in-place patch).
   * @internal
   */
  _clone(): GuildMember {
    return new GuildMember(
      this.client,
      {
        user: {
          id: this.user.id,
          username: this.user.username,
          discriminator: this.user.discriminator,
          global_name: this.user.globalName,
          avatar: this.user.avatar,
          avatar_color: this.user.avatarColor,
          flags: this.user.flags ?? 0,
          bot: this.user.bot,
        },
        nick: this.nick,
        roles: [...this.roles.roleIds],
        joined_at: this.joinedAt.toISOString(),
        communication_disabled_until: this.communicationDisabledUntil?.toISOString() ?? null,
        mute: this.mute,
        deaf: this.deaf,
        avatar: this.avatar,
        banner: this.banner,
        accent_color: this.accentColor,
        profile_flags: this.profileFlags ?? undefined,
        mention_flags: this.mentionFlags,
        bio: this.bio,
        pronouns: this.pronouns,
      },
      this.guild,
    );
  }

  get displayName(): string {
    return this.nick ?? this.user.globalName ?? this.user.username;
  }

  /** Renders a mention for this member: `<@id>`. */
  toString(): string {
    return `<@${this.id}>`;
  }

  avatarURL(options?: { size?: number; extension?: string }): string | null {
    return cdnMemberAvatarURL(this.guild.id, this.id, this.avatar, {
      ...options,
      mediaBase: this.client.instance.endpoints.media,
    });
  }

  displayAvatarURL(options?: { size?: number; extension?: string }): string {
    return this.avatarURL(options) ?? this.user.displayAvatarURL(options);
  }

  bannerURL(options?: { size?: number; extension?: string }): string | null {
    return cdnMemberBannerURL(this.guild.id, this.id, this.banner, {
      ...options,
      mediaBase: this.client.instance.endpoints.media,
    });
  }

  /**
   * PATCH member (`/members/@me` when editing the bot).
   * @example
   * await member.edit({ nick: 'Ada' });
   */
  async edit(options: GuildMemberEditOptions): Promise<this> {
    const isMe = this.client.user?.id === this.id;
    const route = isMe
      ? Routes.guildMemberMe(this.guild.id)
      : Routes.guildMember(this.guild.id, this.id);
    const data = await this.client.rest.patch<APIGuildMember>(route, {
      body: toMemberEditBody(options),
      auth: true,
    });
    this._patch(data);
    if (options.bio !== undefined) this.bio = options.bio;
    if (options.pronouns !== undefined) this.pronouns = options.pronouns;
    if (options.mentionFlags !== undefined) this.mentionFlags = options.mentionFlags;
    return this;
  }

  /**
   * Guild-level permissions (roles only, no channel overwrites).
   * @see {@link permissionsIn} for channel-specific permissions
   */
  get permissions(): PermissionsBitField {
    return new PermissionsBitField(this._effectivePermissions([], []));
  }

  /**
   * Effective permissions in a channel (roles + overwrites).
   * @param channel - The guild channel
   * @returns Computed permissions bitfield
   */
  permissionsIn(channel: GuildChannel): PermissionsBitField {
    return new PermissionsBitField(
      this._effectivePermissions(channel.permissionOverwrites.toJSON(), [...this.roles.roleIds]),
    );
  }

  /**
   * Move to a voice channel, or `null` to disconnect. Requires Move Members.
   * @param channelId - Voice channel ID or null to disconnect
   * @param connectionId - Optional connection ID for multi-session scenarios
   */
  async move(channelId: string | null, connectionId?: string | null): Promise<void> {
    await this.edit({ channelId, connectionId });
  }

  /** Kick this member. Requires Kick Members. */
  async kick(): Promise<void> {
    await this.guild.kick(this.id);
  }

  /** Ban this member. Requires Ban Members. */
  async ban(options?: GuildBanOptions): Promise<void> {
    await this.guild.ban(this.id, options);
  }

  /**
   * Whether the bot can kick this member (cache-only; needs `members.me`).
   * False for the guild owner, self, or when the bot lacks Kick Members / role hierarchy.
   */
  get kickable(): boolean {
    return this._moderatableWith(PermissionFlags.KickMembers);
  }

  /**
   * Whether the bot can ban this member (cache-only; needs `members.me`).
   */
  get bannable(): boolean {
    return this._moderatableWith(PermissionFlags.BanMembers);
  }

  /**
   * Whether the bot can timeout this member (cache-only; needs `members.me`).
   */
  get moderatable(): boolean {
    return this._moderatableWith(PermissionFlags.ModerateMembers);
  }

  private _moderatableWith(flag: bigint): boolean {
    const me = this.guild.members.me;
    if (!me) return false;
    if (this.id === me.id) return false;
    if (this.guild.ownerId != null && String(this.guild.ownerId) === String(this.id)) return false;
    if (!me.permissions.has(flag)) return false;
    return this._compareRolePosition(me) < 0;
  }

  /** Negative when this member's highest role is below `other`'s. */
  private _compareRolePosition(other: GuildMember): number {
    const highest = (m: GuildMember): number => {
      let pos = -1;
      for (const role of m.roles.cache.values()) {
        if (role.position > pos) pos = role.position;
      }
      return pos;
    };
    return highest(this) - highest(other);
  }

  /**
   * Timeout this member for `durationMs` milliseconds, or pass `null` to clear.
   * Requires Moderate Members.
   */
  async timeout(durationMs: number | null, reason?: string): Promise<this> {
    const communicationDisabledUntil =
      durationMs == null || durationMs <= 0
        ? null
        : new Date(Date.now() + durationMs).toISOString();
    return this.edit({
      communicationDisabledUntil,
      ...(reason !== undefined ? { timeoutReason: reason } : {}),
    });
  }

  private _effectivePermissions(overwrites: APIChannelOverwrite[], roleIds: string[]): bigint {
    const ownerId = this.guild.ownerId;
    const isOwner = ownerId != null && ownerId !== '' && String(ownerId) === String(this.id);
    return computePermissions(this._basePermissions(), overwrites, roleIds, this.id, isOwner);
  }

  private _basePermissions(): bigint {
    let base = 0n;
    const everyone = this.guild.roles.get(this.guild.id);
    if (everyone) base |= everyone.permissions.bitfield;
    for (const id of this.roles.roleIds) {
      if (id === this.guild.id) continue;
      const role = this.guild.roles.get(id);
      if (role) base |= role.permissions.bitfield;
    }
    return base;
  }
}
