import { describe, it, expect } from 'vitest';
import { MessageFlagsBitField, MessageFlagsBits } from './MessageFlagsBitField.js';

describe('MessageFlagsBitField', () => {
  it('creates with default 0', () => {
    const bf = new MessageFlagsBitField();
    expect(bf.bitfield).toBe(0n);
  });

  it('has checks SuppressEmbeds', () => {
    const bf = new MessageFlagsBitField([MessageFlagsBits.SuppressEmbeds]);
    expect(bf.has(MessageFlagsBits.SuppressEmbeds)).toBe(true);
    expect(bf.has(MessageFlagsBits.VoiceMessage)).toBe(false);
  });

  it('add and remove', () => {
    const bf = new MessageFlagsBitField()
      .add(MessageFlagsBits.SuppressEmbeds)
      .add(MessageFlagsBits.SuppressNotifications);
    expect(bf.has(MessageFlagsBits.SuppressEmbeds)).toBe(true);
    bf.remove(MessageFlagsBits.SuppressEmbeds);
    expect(bf.has(MessageFlagsBits.SuppressEmbeds)).toBe(false);
  });

  it('serialize returns flags object', () => {
    const bf = new MessageFlagsBitField([MessageFlagsBits.VoiceMessage]);
    const s = bf.serialize();
    expect(s.VoiceMessage).toBe(true);
    expect(s.SuppressEmbeds).toBe(false);
  });

  it('toArray returns enabled flag names', () => {
    const bf = new MessageFlagsBitField([
      MessageFlagsBits.CompactAttachments,
      MessageFlagsBits.SuppressEmbeds,
    ]);
    const arr = bf.toArray();
    expect(arr).toContain('CompactAttachments');
    expect(arr).toContain('SuppressEmbeds');
    expect(arr).toHaveLength(2);
  });
});
