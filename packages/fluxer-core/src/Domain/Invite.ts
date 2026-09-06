import {
  type APIChannelPartial,
  type APIGuildPartial,
  type APIInvite,
  type APIUser,
  type ChannelType,
  InviteType,
  isGroupDmInvite,
  isGuildInvite,
  Routes,
} from '@fluxerjs/types';

import type { Client } from '../ClientCore/Client.js';
import { inviteUrl } from '../Helpers/Instance.js';
import { ErrorCodes } from '../LibErrors/ErrorCodes.js';
import { FluxerError } from '../LibErrors/FluxerError.js';
import { Base } from './Base.js';
import type { Channel } from './Channel/index.js';
import type { Guild } from './Guild/index.js';
import type { User } from './User.js';

/** Extract invite code from a plain code or invite URL. */
export function parseInviteCode(codeOrUrl: string): string {
  const input = codeOrUrl.trim();
  if (!input) {
    throw new FluxerError('Invite code cannot be empty', { code: ErrorCodes.InvalidInvite });
  }

  const fromUrl = (value: string): string | null => {
    if (!URL.canParse(value)) return null;
    try {
      const { pathname } = new URL(value);
      const parts = pathname.split('/').filter(Boolean);
      if (!parts.length) return null;
      const idx = parts.findIndex((s) => /^(invite|invites)$/i.test(s));
      const code = idx >= 0 ? parts[idx + 1] : parts.at(-1);
      return code ? decodeURIComponent(code).trim() : null;
    } catch {
      return null;
    }
  };

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(input);
  const code =
    (hasScheme ? fromUrl(input) : null) ??
    (!hasScheme && URL.canParse(`https://${input}`) ? fromUrl(`https://${input}`) : null) ??
    decodeURIComponent(input).trim();

  if (!code || /[\s/?#]/.test(code)) {
    throw new FluxerError('Invalid invite code or URL', { code: ErrorCodes.InvalidInvite });
  }
  return code;
}

function parseOptionalDate(value: string | null | undefined): Date | null {
  if (value == null || value === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** CamelCase guild metadata embedded on a guild invite (not a cached {@link Guild}). */
export interface InviteGuildSnapshot {
  id: string;
  name: string;
  icon: string | null;
  banner: string | null;
  splash: string | null;
  features: string[];
}

/** CamelCase channel metadata embedded on a guild or group-DM invite. */
export interface InviteChannelSnapshot {
  id: string;
  name: string | null;
  type: ChannelType;
  icon: string | null;
  parentId: string | null;
}

function toInviteGuild(data: APIGuildPartial): InviteGuildSnapshot {
  return {
    id: data.id,
    name: data.name,
    icon: data.icon ?? null,
    banner: data.banner ?? null,
    splash: data.splash ?? null,
    features: data.features ?? [],
  };
}

function toInviteChannel(data: APIChannelPartial): InviteChannelSnapshot {
  return {
    id: data.id,
    name: data.name ?? null,
    type: data.type,
    icon: data.icon ?? null,
    parentId: data.parent_id ?? null,
  };
}

/**
 * Invite to a guild channel or group DM.
 * Discriminate with `type` / `isGuild()` / `isGroupDM()`.
 * `guildSnapshot` / `channelSnapshot` are camelCase metadata, not cached structures.
 * Use {@link resolveGuild} / {@link resolveChannel} for live structures.
 */
export class Invite extends Base {
  readonly client: Client;
  readonly code: string;
  readonly type: InviteType;
  readonly guildSnapshot: InviteGuildSnapshot | null;
  readonly channelSnapshot: InviteChannelSnapshot | null;
  readonly inviter: User | null;
  readonly memberCount: number | null;
  readonly presenceCount: number | null;
  readonly expiresAt: Date | null;
  readonly temporary: boolean | null;
  readonly createdAt: Date | null;
  readonly uses: number | null;
  readonly maxUses: number | null;
  readonly maxAge: number | null;

  constructor(client: Client, data: APIInvite) {
    super();
    this.client = client;
    this.code = data.code;
    this.type = data.type;
    this.guildSnapshot = isGuildInvite(data) ? toInviteGuild(data.guild) : null;
    this.channelSnapshot =
      isGuildInvite(data) || isGroupDmInvite(data) ? toInviteChannel(data.channel) : null;
    this.inviter = data.inviter ? client.getOrCreateUser(data.inviter as APIUser) : null;
    this.memberCount = data.member_count ?? null;
    this.presenceCount = isGuildInvite(data) ? (data.presence_count ?? null) : null;
    this.expiresAt = parseOptionalDate(data.expires_at);
    this.temporary = data.temporary ?? null;
    this.createdAt = parseOptionalDate(data.created_at);
    this.uses = data.uses ?? null;
    this.maxUses = data.max_uses ?? null;
    this.maxAge = data.max_age ?? null;
  }

  isGuild(): boolean {
    return this.type === InviteType.Guild;
  }

  isGroupDM(): boolean {
    return this.type === InviteType.GroupDM;
  }

  /** Full invite URL (uses this client's instance invite base). */
  get url(): string {
    return inviteUrl(this.client.instance.endpoints.invite, this.code);
  }

  /**
   * Resolve the cached/fetched {@link Guild} for this invite, or null.
   * `guildSnapshot` is metadata only.
   */
  async resolveGuild(): Promise<Guild | null> {
    if (!this.guildSnapshot?.id) return null;
    return this.client.guilds.resolve(this.guildSnapshot.id);
  }

  /**
   * Resolve the cached/fetched {@link Channel} for this invite, or null.
   * `channelSnapshot` is metadata only.
   */
  async resolveChannel(): Promise<Channel | null> {
    if (!this.channelSnapshot?.id) return null;
    return this.client.channels.resolve(this.channelSnapshot.id);
  }

  /** Fetch invite metadata by code or URL (does not join). */
  static async fetch(client: Client, codeOrUrl: string): Promise<Invite> {
    const data = await client.rest.get(Routes.invite(parseInviteCode(codeOrUrl)));
    return new Invite(client, data as APIInvite);
  }

  /** Delete this invite. Requires Manage Guild or Create Instant Invite. */
  async delete(): Promise<void> {
    await this.client.rest.delete(Routes.invite(this.code), { auth: true });
  }
}
