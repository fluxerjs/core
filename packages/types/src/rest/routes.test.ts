import { describe, it, expect } from 'vitest';
import { Routes } from './routes.js';

describe('Routes', () => {
  describe('channelMessageReaction', () => {
    it('encodes unicode emoji in URL', () => {
      const path = Routes.channelMessageReaction('123', '456', '❤');
      expect(path).toContain(encodeURIComponent('❤'));
      expect(path).toMatch(/reactions\/[^/]+\/?/);
    });

    it('encodes custom emoji name:id format', () => {
      const path = Routes.channelMessageReaction('123', '456', 'custom:123456789012345678');
      expect(path).toContain(encodeURIComponent('custom:123456789012345678'));
    });

    it('does not double-encode already encoded input', () => {
      const encoded = encodeURIComponent('❤');
      const path = Routes.channelMessageReaction('123', '456', encoded);
      expect(path).toContain('%25E2%259D%25A4'); // double-encoded
    });
  });

  describe('channel', () => {
    it('builds channel path', () => {
      expect(Routes.channel('123456789012345678')).toBe('/channels/123456789012345678');
    });
  });

  describe('channelMessage', () => {
    it('builds message path', () => {
      expect(Routes.channelMessage('111', '222')).toBe('/channels/111/messages/222');
    });
  });

  describe('invite', () => {
    it('encodes invite code', () => {
      const path = Routes.invite('abc123');
      expect(path).toBe('/invites/abc123');
      expect(Routes.invite('code+with/special')).toContain(encodeURIComponent('code+with/special'));
    });
  });
});
