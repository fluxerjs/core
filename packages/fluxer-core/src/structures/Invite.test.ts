import { describe, it, expect } from 'vitest';
import { Client, Invite } from '../';

function createMockClient() {
  return {} as Client;
}

function createInvite(overrides: { code?: string } = {}) {
  return new Invite(createMockClient(), {
    code: overrides.code ?? 'abc123',
    type: 0,
    guild: { id: 'g1', name: 'Test' },
    channel: { id: 'ch1', name: 'general', type: 0 },
  });
}

describe('Invite', () => {
  describe('url', () => {
    it('returns full invite URL with code', () => {
      const invite = createInvite({ code: 'xyz789' });
      expect(invite.url).toBe('https://fluxer.gg/xyz789');
    });

    it('uses invite code from constructor', () => {
      const invite = createInvite({ code: 'discord' });
      expect(invite.url).toBe('https://fluxer.gg/discord');
    });
  });

  describe('constructor', () => {
    it('parses invite code and channel', () => {
      const invite = createInvite({ code: 'testcode' });
      expect(invite.code).toBe('testcode');
      expect(invite.channel.name).toBe('general');
    });
  });
});
