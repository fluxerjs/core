import { describe, expect, it } from 'vitest';
import { AttachmentBuilder, AttachmentMeta } from './AttachmentBuilder.js';
import { EmbedBuilder } from './EmbedBuilder.js';
import { MessagePayload } from './MessagePayload.js';

describe('MessagePayload', () => {
  it('creates empty payload', () => {
    const p = new MessagePayload();
    expect(p.toJSON()).toEqual({});
  });

  it('setContent sets and clears', () => {
    const p = new MessagePayload();
    p.setContent('hello');
    expect(p.data.content).toBe('hello');
    p.setContent(null);
    expect(p.data.content).toBeUndefined();
  });

  it('setContent throws for over 2000 chars', () => {
    const p = new MessagePayload();
    expect(() => p.setContent('x'.repeat(2001))).toThrow(RangeError);
  });

  it('setContent accepts exactly 2000 chars', () => {
    const p = new MessagePayload();
    p.setContent('x'.repeat(2000));
    expect(p.data.content).toHaveLength(2000);
  });

  it('setEmbeds accepts EmbedBuilder and raw request embeds', () => {
    const embed = new EmbedBuilder().setTitle('T').setDescription('D');
    const p = new MessagePayload().setEmbeds([embed]);
    expect(p.data.embeds).toHaveLength(1);
    expect(p.data.embeds![0]).toEqual(embed.toJSON());
  });

  it('setEmbeds throws for more than 10', () => {
    const p = new MessagePayload();
    const embeds = Array.from({ length: 11 }, () =>
      new EmbedBuilder().setTitle('x').setDescription('y'),
    );
    expect(() => p.setEmbeds(embeds)).toThrow(RangeError);
  });

  it('addEmbed adds one at a time', () => {
    const p = new MessagePayload();
    p.addEmbed(new EmbedBuilder().setTitle('1').setDescription('a'));
    p.addEmbed(new EmbedBuilder().setTitle('2').setDescription('b'));
    expect(p.data.embeds).toHaveLength(2);
    expect(p.data.embeds![0].title).toBe('1');
    expect(p.data.embeds![1].title).toBe('2');
  });

  it('setAttachments accepts AttachmentMeta', () => {
    const att = new AttachmentMeta(0, 'file.png');
    const p = new MessagePayload().setAttachments([att]);
    expect(p.data.attachments).toEqual([{ id: 0, filename: 'file.png' }]);
  });

  it('setAttachments accepts AttachmentBuilder via toJSON(id)', () => {
    const att = new AttachmentBuilder(Buffer.from('x'), { name: 'file.png' });
    const p = new MessagePayload().setAttachments([att]);
    expect(p.data.attachments).toEqual([{ id: 0, filename: 'file.png' }]);
  });

  it('setAttachments accepts plain objects', () => {
    const p = new MessagePayload().setAttachments([
      { id: 0, filename: 'a.txt', description: 'desc' },
    ]);
    expect(p.data.attachments).toEqual([{ id: 0, filename: 'a.txt', description: 'desc' }]);
  });

  it('setReply accepts camelCase and emits snake_case', () => {
    const p = new MessagePayload().setReply({
      channelId: 'c1',
      messageId: 'm1',
      guildId: 'g1',
    });
    expect(p.toJSON().message_reference).toEqual({
      channel_id: 'c1',
      message_id: 'm1',
      guild_id: 'g1',
    });
  });

  it('setReply accepts snake_case wire input', () => {
    const p = new MessagePayload().setReply({
      channel_id: 'c1',
      message_id: 'm1',
      guild_id: 'g1',
    });
    expect(p.data.message_reference).toEqual({
      channel_id: 'c1',
      message_id: 'm1',
      guild_id: 'g1',
    });
  });

  it('setReply omits guild_id when null', () => {
    const p = new MessagePayload().setReply({
      channelId: 'c1',
      messageId: 'm1',
      guildId: null,
    });
    expect(p.data.message_reference?.guild_id).toBeUndefined();
  });

  it('setTTS and setFlags', () => {
    const p = new MessagePayload().setTTS(true).setFlags(64);
    expect(p.data.tts).toBe(true);
    expect(p.data.flags).toBe(64);
  });

  describe('MessagePayload.create', () => {
    it('creates from string', () => {
      const p = MessagePayload.create('Hi');
      expect(p.data.content).toBe('Hi');
    });

    it('creates from options object', () => {
      const p = MessagePayload.create({
        content: 'Test',
        embeds: [new EmbedBuilder().setTitle('E').setDescription('D')],
        tts: true,
      });
      expect(p.data.content).toBe('Test');
      expect(p.data.embeds).toHaveLength(1);
      expect(p.data.tts).toBe(true);
    });

    it('creates empty when no args', () => {
      const p = MessagePayload.create();
      expect(p.toJSON()).toEqual({});
    });
  });
});
