import { describe, expect, it } from 'vitest';
import { normalizeGuildPayload } from './guildUtils.js';

const guildProperties = {
  id: 'g1',
  name: 'Test Guild',
  icon: null,
  banner: null,
  splash: null,
  owner_id: 'owner1',
  features: [],
  afk_timeout: 0,
  nsfw_level: 0,
  verification_level: 0,
  mfa_level: 0,
  explicit_content_filter: 0,
  default_message_notifications: 0,
};

describe('normalizeGuildPayload', () => {
  it('unwraps nested gateway properties and preserves top-level roles', () => {
    const roles = [
      {
        id: 'r1',
        name: 'Role',
        color: 0,
        position: 1,
        permissions: '0',
        hoist: false,
        mentionable: false,
      },
    ];

    expect(
      normalizeGuildPayload({
        id: 'g1',
        properties: guildProperties,
        roles,
        channels: [],
        members: [],
      }),
    ).toEqual({ ...guildProperties, roles });
  });

  it('preserves flat REST and guild update payloads', () => {
    expect(normalizeGuildPayload(guildProperties)).toBe(guildProperties);
    expect(normalizeGuildPayload({ id: 'g1', name: 'Updated Guild' })).toEqual({
      id: 'g1',
      name: 'Updated Guild',
    });
  });

  it('rejects malformed nested properties', () => {
    expect(normalizeGuildPayload({ id: 'g1', properties: null })).toBeNull();
    expect(normalizeGuildPayload({ id: 'g1', properties: 'invalid' })).toBeNull();
  });
});
