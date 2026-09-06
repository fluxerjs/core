import { InviteType } from '@fluxerjs/types';
import { describe, expect, it } from 'vitest';
import { type Client, Invite } from '../';
import { DEFAULT_INSTANCE_ENDPOINTS } from '../Helpers/Instance.js';

function createMockClient() {
  return {
    getOrCreateUser: (u: { id: string }) => u,
    guilds: { get: () => null, resolve: async () => null },
    channels: { get: () => null, resolve: async () => null },
    instance: { endpoints: DEFAULT_INSTANCE_ENDPOINTS, discovery: null },
  } as unknown as Client;
}

describe('Invite', () => {
  describe('guild invite', () => {
    it('exposes guildSnapshot and channelSnapshot', () => {
      const invite = new Invite(createMockClient(), {
        code: 'xyz789',
        type: InviteType.Guild,
        guild: { id: 'g1', name: 'Test' },
        channel: { id: 'ch1', name: 'general', type: 0, parent_id: 'cat1' },
        created_at: '2026-01-01T00:00:00.000Z',
        expires_at: '2026-02-01T00:00:00.000Z',
      });
      expect(invite.url).toBe('https://fluxer.gg/xyz789');
      expect(invite.isGuild()).toBe(true);
      expect(invite.guildSnapshot?.name).toBe('Test');
      expect(invite.channelSnapshot?.name).toBe('general');
      expect(invite.channelSnapshot?.parentId).toBe('cat1');
      expect(invite.channelSnapshot).not.toHaveProperty('parent_id');
      expect(invite.createdAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
      expect(invite.expiresAt).toEqual(new Date('2026-02-01T00:00:00.000Z'));
    });
  });

  describe('group DM invite', () => {
    it('has channelSnapshot but no guildSnapshot', () => {
      const invite = new Invite(createMockClient(), {
        code: 'gdm1',
        type: InviteType.GroupDM,
        channel: { id: 'ch2', name: 'friends', type: 3 },
        member_count: 4,
      });
      expect(invite.isGroupDM()).toBe(true);
      expect(invite.guildSnapshot).toBeNull();
      expect(invite.channelSnapshot?.id).toBe('ch2');
      expect(invite.memberCount).toBe(4);
    });
  });
});
