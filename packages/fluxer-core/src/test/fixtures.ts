import type {
  APIChannel,
  APIGuild,
  APIGuildMember,
  APIMessage,
  APIRole,
  APIUserPartial,
} from '@fluxerjs/types';
import { ChannelType } from '@fluxerjs/types';

/** Minimal user payload for unit tests. */
export function fixtureUser(overrides: Partial<APIUserPartial> = {}): APIUserPartial {
  return {
    id: '100000000000000001',
    username: 'testuser',
    discriminator: '0',
    ...overrides,
  };
}

/** Minimal flat guild payload accepted by the guild payload normalizers. */
export function fixtureGuild(overrides: Partial<APIGuild> = {}): APIGuild {
  return {
    id: '200000000000000001',
    name: 'Test Guild',
    icon: null,
    banner: null,
    owner_id: '100000000000000001',
    afk_timeout: 300,
    features: [],
    verification_level: 0,
    mfa_level: 0,
    nsfw_level: 0,
    explicit_content_filter: 0,
    default_message_notifications: 0,
    ...overrides,
  };
}

/** Minimal guild text channel. */
export function fixtureTextChannel(overrides: Partial<APIChannel> = {}): APIChannel {
  return {
    id: '300000000000000001',
    type: ChannelType.GuildText,
    guild_id: '200000000000000001',
    name: 'general',
    position: 0,
    permission_overwrites: [],
    ...overrides,
  } as APIChannel;
}

/** Minimal role. */
export function fixtureRole(overrides: Partial<APIRole> = {}): APIRole {
  return {
    id: '400000000000000001',
    name: 'Member',
    color: 0,
    position: 1,
    permissions: '0',
    hoist: false,
    mentionable: false,
    ...overrides,
  };
}

/** Minimal guild member. */
export function fixtureMember(
  overrides: Partial<APIGuildMember> & { user?: APIUserPartial } = {},
): APIGuildMember & { user: APIUserPartial } {
  const { user, ...rest } = overrides;
  return {
    user: fixtureUser(user),
    roles: [],
    joined_at: '2024-01-01T00:00:00.000Z',
    nick: null,
    mute: false,
    deaf: false,
    ...rest,
  };
}

/** Minimal message. */
export function fixtureMessage(overrides: Partial<APIMessage> = {}): APIMessage {
  return {
    id: '500000000000000001',
    channel_id: '300000000000000001',
    author: fixtureUser(),
    content: 'hello',
    timestamp: '2024-01-01T00:00:00.000Z',
    edited_timestamp: null,
    pinned: false,
    type: 0,
    flags: 0,
    ...overrides,
  } as APIMessage;
}
