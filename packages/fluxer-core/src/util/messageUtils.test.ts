import { describe, it, expect } from 'vitest';
import { buildSendBody } from './messageUtils.js';
import { EmbedBuilder } from '@fluxerjs/builders';

describe('buildSendBody', () => {
  it('converts string to content-only body', () => {
    const result = buildSendBody('Hello world');
    expect(result).toEqual({ content: 'Hello world' });
  });

  it('passes through content from options', () => {
    const result = buildSendBody({ content: 'Test' });
    expect(result.content).toBe('Test');
  });

  it('serializes EmbedBuilder to APIEmbed', () => {
    const embed = new EmbedBuilder().setTitle('Test').setDescription('Desc');
    const result = buildSendBody({ embeds: [embed] });
    expect(result.embeds).toHaveLength(1);
    expect(result.embeds![0]).toEqual(embed.toJSON());
  });

  it('passes through raw APIEmbed', () => {
    const raw = { title: 'Raw', type: 'rich' as const };
    const result = buildSendBody({ embeds: [raw] });
    expect(result.embeds).toHaveLength(1);
    expect(result.embeds![0]).toBe(raw);
  });

  it('builds attachments from files when no attachments metadata', () => {
    const result = buildSendBody({
      files: [
        { name: 'a.txt', data: new Uint8Array() },
        { name: 'b.png', data: new Uint8Array(), filename: 'custom.png' },
      ],
    });
    expect(result.attachments).toEqual([
      { id: 0, filename: 'a.txt' },
      { id: 1, filename: 'custom.png' },
    ]);
  });

  it('uses attachments metadata when provided with files', () => {
    const result = buildSendBody({
      files: [{ name: 'a.txt', data: new Uint8Array() }],
      attachments: [
        { id: 0, filename: 'a.txt', title: 'My File', description: 'A file' },
      ],
    });
    expect(result.attachments).toEqual([
      { id: 0, filename: 'a.txt', title: 'My File', description: 'A file' },
    ]);
  });

  it('includes flags in attachment metadata', () => {
    const result = buildSendBody({
      files: [{ name: 'a.txt', data: new Uint8Array() }],
      attachments: [{ id: 0, filename: 'a.txt', flags: 8 }],
    });
    expect(result.attachments![0].flags).toBe(8);
  });
});
