import { describe, expect, it } from 'vitest';
import { EmbedBuilder } from './EmbedBuilder.js';

const WIRE_KEYS = new Set([
  'title',
  'description',
  'url',
  'color',
  'timestamp',
  'author',
  'footer',
  'image',
  'thumbnail',
  'fields',
]);

function assertWire(json: object): void {
  for (const key of Object.keys(json)) {
    expect(WIRE_KEYS.has(key)).toBe(true);
  }
  expect(json).not.toHaveProperty('video');
  expect(json).not.toHaveProperty('audio');
  expect(json).not.toHaveProperty('type');
  expect(json).not.toHaveProperty('provider');
  expect(json).not.toHaveProperty('children');
}

describe('EmbedBuilder', () => {
  describe('toJSON wire shape', () => {
    it('emits request keys only (no video/audio/type)', () => {
      const json = new EmbedBuilder()
        .setTitle('Title')
        .setDescription('Description')
        .setImage('https://example.com/img.png')
        .setThumbnail('https://example.com/thumb.png')
        .toJSON();

      assertWire(json);
      expect('video' in json).toBe(false);
      expect('audio' in json).toBe(false);
    });

    it('strips polluted non-request keys from data', () => {
      const embed = new EmbedBuilder().setTitle('T');
      Object.assign(embed.data, {
        video: { url: 'https://example.com/v.mp4' },
        audio: { url: 'https://example.com/a.mp3' },
        type: 'rich',
      });
      assertWire(embed.toJSON());
    });
  });

  describe('setImage and setThumbnail', () => {
    it('accept string URL', () => {
      const json = new EmbedBuilder()
        .setImage('https://example.com/img.png')
        .setThumbnail('https://example.com/thumb.png')
        .toJSON();

      expect(json.image).toEqual({ url: 'https://example.com/img.png' });
      expect(json.thumbnail).toEqual({ url: 'https://example.com/thumb.png' });
    });

    it('accept EmbedMediaOptions with description', () => {
      const json = new EmbedBuilder()
        .setImage({ url: 'https://example.com/img.png', description: 'alt' })
        .setThumbnail({ url: 'https://example.com/thumb.png' })
        .toJSON();

      expect(json.image).toEqual({ url: 'https://example.com/img.png', description: 'alt' });
      expect(json.thumbnail).toEqual({ url: 'https://example.com/thumb.png' });
    });
  });

  describe('validation', () => {
    it('setTitle throws for over 256 chars', () => {
      expect(() => new EmbedBuilder().setTitle('x'.repeat(257))).toThrow(RangeError);
    });

    it('setDescription throws for over 4096 chars', () => {
      expect(() => new EmbedBuilder().setDescription('x'.repeat(4097))).toThrow(RangeError);
    });

    it('setURL throws for invalid URL', () => {
      expect(() => new EmbedBuilder().setURL('not-a-valid-url')).toThrow('Invalid embed URL');
    });

    it('setImage throws for invalid media URL', () => {
      expect(() => new EmbedBuilder().setImage({ url: 'invalid' })).toThrow(
        'Invalid embed media URL',
      );
    });

    it('toJSON throws when total length exceeds 6000', () => {
      const embed = new EmbedBuilder()
        .setTitle('x'.repeat(256))
        .setDescription('y'.repeat(2000))
        .addFields(
          { name: 'n'.repeat(256), value: 'v'.repeat(600) },
          { name: 'n'.repeat(256), value: 'v'.repeat(600) },
          { name: 'n'.repeat(256), value: 'v'.repeat(600) },
          { name: 'n'.repeat(256), value: 'v'.repeat(600) },
          { name: 'n'.repeat(256), value: 'v'.repeat(500) },
        );
      expect(() => embed.toJSON()).toThrow(RangeError);
    });
  });

  describe('camelCase in / snake_case out', () => {
    it('setAuthor maps iconURL → icon_url', () => {
      const json = new EmbedBuilder()
        .setAuthor({
          name: 'Author',
          url: 'https://example.com',
          iconURL: 'https://example.com/icon.png',
        })
        .toJSON();

      expect(json.author).toEqual({
        name: 'Author',
        url: 'https://example.com',
        icon_url: 'https://example.com/icon.png',
      });
      expect(json.author).not.toHaveProperty('iconURL');
    });

    it('setFooter maps iconURL → icon_url', () => {
      const json = new EmbedBuilder()
        .setFooter({ text: 'Footer text', iconURL: 'https://example.com/footer.png' })
        .toJSON();

      expect(json.footer).toEqual({
        text: 'Footer text',
        icon_url: 'https://example.com/footer.png',
      });
      expect(json.footer).not.toHaveProperty('iconURL');
    });

    it('setAuthor null clears author', () => {
      const embed = new EmbedBuilder().setAuthor({ name: 'A' }).setAuthor(null);
      expect(embed.toJSON().author).toBeUndefined();
    });
  });

  describe('setColor and setTimestamp', () => {
    it('setColor accepts number, hex, RGB array', () => {
      const embed = new EmbedBuilder().setColor(0xff0000);
      expect(embed.toJSON().color).toBe(0xff0000);
      embed.setColor('#00ff00');
      expect(embed.toJSON().color).toBe(0x00ff00);
      embed.setColor([0, 0, 255]);
      expect(embed.toJSON().color).toBe(0x0000ff);
    });

    it('setColor null clears', () => {
      expect(new EmbedBuilder().setColor(0xff0000).setColor(null).toJSON().color).toBeUndefined();
    });

    it('setTimestamp accepts Date and number', () => {
      const d = new Date('2021-01-01T00:00:00Z');
      const embed = new EmbedBuilder().setTitle('T').setTimestamp(d);
      expect(embed.toJSON().timestamp).toBe('2021-01-01T00:00:00.000Z');
      embed.setTimestamp(1609459200000);
      expect(embed.toJSON().timestamp).toBe('2021-01-01T00:00:00.000Z');
    });

    it('setTimestamp with no argument uses current time', () => {
      const before = Date.now();
      const ts = new EmbedBuilder().setTitle('T').setTimestamp().toJSON().timestamp;
      const after = Date.now();
      expect(ts).toBeDefined();
      const ms = Date.parse(ts!);
      expect(ms).toBeGreaterThanOrEqual(before);
      expect(ms).toBeLessThanOrEqual(after);
    });

    it('setTimestamp null clears', () => {
      expect(
        new EmbedBuilder().setTitle('T').setTimestamp(new Date()).setTimestamp(null).toJSON()
          .timestamp,
      ).toBeUndefined();
    });
  });

  describe('fields', () => {
    it('setFields replaces all fields', () => {
      const json = new EmbedBuilder()
        .setTitle('T')
        .addFields({ name: 'Old', value: '1' })
        .setFields({ name: 'New', value: '2' })
        .toJSON();
      expect(json.fields).toEqual([{ name: 'New', value: '2', inline: undefined }]);
    });

    it('setFields() with no args clears fields', () => {
      const json = new EmbedBuilder()
        .setTitle('T')
        .addFields({ name: 'A', value: '1' })
        .setFields()
        .toJSON();
      expect(json.fields).toBeUndefined();
    });

    it('addFields adds multiple', () => {
      const json = new EmbedBuilder()
        .setTitle('T')
        .addFields({ name: 'A', value: '1' }, { name: 'B', value: '2', inline: true })
        .toJSON();
      expect(json.fields).toHaveLength(2);
      expect(json.fields![0]).toEqual({ name: 'A', value: '1', inline: undefined });
      expect(json.fields![1]).toEqual({ name: 'B', value: '2', inline: true });
    });

    it('spliceFields replaces at index', () => {
      const json = new EmbedBuilder()
        .setTitle('T')
        .addFields({ name: 'A', value: '1' }, { name: 'B', value: '2' })
        .spliceFields(1, 1, { name: 'X', value: 'replacement' })
        .toJSON();
      expect(json.fields).toHaveLength(2);
      expect(json.fields![1].name).toBe('X');
    });
  });

  describe('EmbedBuilder.from', () => {
    it('copies request fields only', () => {
      const source = {
        title: 'Hello',
        description: 'World',
        image: { url: 'https://example.com/img.png' },
      };
      const json = EmbedBuilder.from(source).toJSON();
      expect(json.title).toBe('Hello');
      expect(json.description).toBe('World');
      expect(json.image).toEqual(source.image);
      assertWire(json);
    });

    it('does not copy video or audio from response embeds', () => {
      const json = EmbedBuilder.from({
        type: 'rich',
        title: 'Media',
        video: {
          url: 'https://example.com/video.mp4',
          duration: 90,
          width: 1280,
          height: 720,
          flags: 0,
        },
        audio: {
          url: 'https://example.com/audio.mp3',
          duration: 180,
          content_type: 'audio/mpeg',
          flags: 0,
        },
      }).toJSON();

      expect(json.title).toBe('Media');
      assertWire(json);
    });

    it('reads camelCase iconUrl and Date timestamp from received embeds', () => {
      const json = EmbedBuilder.from({
        title: 'Read',
        description: 'path',
        timestamp: new Date('2026-01-01T00:00:00.000Z'),
        author: { name: 'Ada', iconUrl: 'https://example.com/icon.png' },
        footer: { text: 'foot', iconUrl: 'https://example.com/foot.png' },
      }).toJSON();

      expect(json.timestamp).toBe('2026-01-01T00:00:00.000Z');
      expect(json.author).toEqual({
        name: 'Ada',
        icon_url: 'https://example.com/icon.png',
      });
      expect(json.footer).toEqual({
        text: 'foot',
        icon_url: 'https://example.com/foot.png',
      });
      assertWire(json);
    });
  });
});
