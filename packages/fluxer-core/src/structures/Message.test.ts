import { describe, it, expect } from 'vitest';
import { Message } from '../';

describe('Message._createMessageBody', () => {
  describe('reply (message_reference)', () => {
    it('includes message_reference in body when replying (API expects this field)', async () => {
      const ref = {
        channel_id: 'ch1',
        message_id: 'msg1',
        guild_id: 'g1',
      };
      const payload = await Message._createMessageBody('Pong!', ref);
      expect(payload.body).toHaveProperty('message_reference');
      expect(payload.body.message_reference).toEqual(ref);
      expect(payload.body.content).toBe('Pong!');
    });

    it('must NOT use referenced_message (that is for API response only)', async () => {
      const ref = { channel_id: 'ch1', message_id: 'msg1' };
      const payload = await Message._createMessageBody('Reply', ref);
      expect(payload.body).not.toHaveProperty('referenced_message');
      expect(payload.body).toHaveProperty('message_reference');
    });

    it('includes message_reference with options object', async () => {
      const ref = { channel_id: 'ch1', message_id: 'msg1', guild_id: 'g1' };
      const payload = await Message._createMessageBody({ content: 'Hello', embeds: [] }, ref);
      expect(payload.body.message_reference).toEqual(ref);
      expect(payload.body.content).toBe('Hello');
    });

    it('works without guild_id for DMs', async () => {
      const ref = { channel_id: 'dm1', message_id: 'msg1' };
      const payload = await Message._createMessageBody('DM reply', ref);
      expect(payload.body.message_reference).toEqual(ref);
      expect(payload.body.message_reference).not.toHaveProperty('guild_id');
    });
  });

  describe('send (no reference)', () => {
    it('does not include message_reference when not replying', async () => {
      const payload = await Message._createMessageBody('Standalone message');
      expect(payload.body).not.toHaveProperty('message_reference');
      expect(payload.body).not.toHaveProperty('referenced_message');
      expect(payload.body.content).toBe('Standalone message');
    });

    it('passes through content from options', async () => {
      const payload = await Message._createMessageBody({ content: 'Test' });
      expect(payload.body.content).toBe('Test');
    });
  });

  describe('validation', () => {
    it('throws RangeError for empty string', async () => {
      await expect(Message._createMessageBody('')).rejects.toThrow(RangeError);
      await expect(Message._createMessageBody('')).rejects.toThrow('Cannot send an empty message');
    });

    it('accepts non-empty string', async () => {
      const payload = await Message._createMessageBody('x');
      expect(payload.body.content).toBe('x');
    });
  });

  describe('files', () => {
    it('includes files in payload when provided', async () => {
      const data = Buffer.from('hello');
      const payload = await Message._createMessageBody({
        content: 'File attached',
        files: [{ name: 'test.txt', data }],
      });
      expect(payload.files).toHaveLength(1);
      expect(payload.files![0].name).toBe('test.txt');
      expect(payload.body.content).toBe('File attached');
    });

    it('reply with files includes message_reference', async () => {
      const ref = { channel_id: 'ch1', message_id: 'msg1' };
      const payload = await Message._createMessageBody(
        { content: 'Reply with file', files: [{ name: 'a.txt', data: Buffer.from('x') }] },
        ref,
      );
      expect(payload.body.message_reference).toEqual(ref);
      expect(payload.files).toHaveLength(1);
    });
  });
});
