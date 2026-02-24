import { describe, it, expect } from 'vitest';
import { Message } from '../';
import { EmbedBuilder } from '@fluxerjs/builders';

describe('Message._createMessageBody', () => {
  it('converts string to content-only body', async () => {
    const result = await Message._createMessageBody('Hello world');
    expect(result.body).toEqual({ content: 'Hello world' });
  });

  it('passes through content from options', async () => {
    const result = await Message._createMessageBody({ content: 'Test' });
    expect(result.body.content).toBe('Test');
  });

  it('serializes EmbedBuilder to APIEmbed', async () => {
    const embed = new EmbedBuilder().setTitle('Test').setDescription('Desc');
    const result = await Message._createMessageBody({ embeds: [embed] });
    expect(result.body.embeds).toHaveLength(1);
    expect(result.body.embeds![0]).toEqual(embed.toJSON());
  });

  it('passes through raw APIEmbed', async () => {
    const raw = { title: 'Raw', type: 'rich' as const };
    const result = await Message._createMessageBody({ embeds: [raw] });
    expect(result.body.embeds).toHaveLength(1);
    expect(result.body.embeds![0]).toBe(raw);
  });

  it('builds attachments from files when no attachments metadata', async () => {
    const result = await Message._createMessageBody({
      files: [
        { name: 'a.txt', data: new Uint8Array() },
        { name: 'b.png', data: new Uint8Array(), filename: 'custom.png' },
      ],
    });
    expect(result.body.attachments).toEqual([
      { id: 0, filename: 'a.txt' },
      { id: 1, filename: 'custom.png' },
    ]);
  });

  it('uses attachments metadata when provided with files', async () => {
    const result = await Message._createMessageBody({
      files: [{ name: 'a.txt', data: new Uint8Array() }],
      attachments: [{ id: 0, filename: 'a.txt', title: 'My File', description: 'A file' }],
    });
    expect(result.body.attachments).toEqual([
      { id: 0, filename: 'a.txt', title: 'My File', description: 'A file' },
    ]);
  });

  it('includes flags in attachment metadata', async () => {
    const result = await Message._createMessageBody({
      files: [{ name: 'a.txt', data: new Uint8Array() }],
      attachments: [{ id: 0, filename: 'a.txt', flags: 8 }],
    });
    expect(result.body.attachments![0].flags).toBe(8);
  });

  it('returns empty result when no content, embeds, or files', async () => {
    const result = await Message._createMessageBody({});
    expect(result.body).toEqual({});
  });

  it('handles mixed EmbedBuilder and raw embed', async () => {
    const raw = { title: 'Raw', type: 'rich' as const };
    const built = new EmbedBuilder().setTitle('Built').setDescription('D');
    const result = await Message._createMessageBody({ embeds: [raw, built] });
    expect(result.body.embeds).toHaveLength(2);
    expect(result.body.embeds![0]).toBe(raw);
    expect(result.body.embeds![1]).toEqual(built.toJSON());
  });
});
