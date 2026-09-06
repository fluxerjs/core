import { describe, expect, it } from 'vitest';
import { AttachmentBuilder, AttachmentMeta } from './AttachmentBuilder.js';

describe('AttachmentBuilder', () => {
  it('creates from buffer and name options', () => {
    const data = Buffer.from('hello');
    const att = new AttachmentBuilder(data, { name: 'report.txt' });
    expect(att.attachment).toBe(data);
    expect(att.url).toBeNull();
    expect(att.name).toBe('report.txt');
    expect(att.filename).toBe('report.txt');
    expect(att.spoiler).toBe(false);
    expect(att.toFileData()).toEqual({
      name: 'report.txt',
      data,
      filename: 'report.txt',
    });
  });

  it('creates from URL string', () => {
    const att = new AttachmentBuilder('https://example.com/a.png', { name: 'a.png' });
    expect(att.url).toBe('https://example.com/a.png');
    expect(att.attachment).toBeNull();
    expect(att.toFileData()).toEqual({
      name: 'a.png',
      url: 'https://example.com/a.png',
      filename: 'a.png',
    });
  });

  it('applies spoiler and description options', () => {
    const att = new AttachmentBuilder(Buffer.from('x'), {
      name: 'photo.jpg',
      description: 'A nice photo',
      spoiler: true,
    });
    expect(att.filename).toBe('SPOILER_photo.jpg');
    expect(att.description).toBe('A nice photo');
    expect(att.spoiler).toBe(true);
    expect(att.toJSON(1)).toEqual({
      id: 1,
      filename: 'SPOILER_photo.jpg',
      description: 'A nice photo',
    });
  });

  it('throws for empty filename', () => {
    expect(() => new AttachmentBuilder(Buffer.from('x'), { name: '' })).toThrow(
      'Filename is required',
    );
    expect(() => new AttachmentBuilder(Buffer.from('x'), { name: '   ' })).toThrow(
      'Filename is required',
    );
  });

  it('setName / setDescription / setSpoiler chain', () => {
    const att = new AttachmentBuilder(Buffer.from('x'), { name: 'file.png' });
    att.setName('renamed.png').setDescription('Alt').setSpoiler(true);
    expect(att.filename).toBe('SPOILER_renamed.png');
    expect(att.description).toBe('Alt');
    att.setSpoiler(false);
    expect(att.filename).toBe('renamed.png');
    att.setDescription(null);
    expect(att.description).toBeUndefined();
  });
});

describe('AttachmentMeta', () => {
  it('creates with required id and filename', () => {
    const att = new AttachmentMeta(0, 'image.png');
    expect(att.id).toBe(0);
    expect(att.filename).toBe('image.png');
    expect(att.spoiler).toBe(false);
    expect(att.description).toBeUndefined();
  });

  it('creates with description and spoiler options', () => {
    const att = new AttachmentMeta(1, 'photo.jpg', {
      description: 'A nice photo',
      spoiler: true,
    });
    expect(att.id).toBe(1);
    expect(att.filename).toBe('SPOILER_photo.jpg');
    expect(att.description).toBe('A nice photo');
    expect(att.spoiler).toBe(true);
  });

  it('throws for empty filename', () => {
    expect(() => new AttachmentMeta(0, '')).toThrow('Filename is required');
    expect(() => new AttachmentMeta(0, '   ')).toThrow('Filename is required');
  });

  it('setName updates filename', () => {
    const att = new AttachmentMeta(0, 'file.png');
    att.setName('renamed.png');
    expect(att.filename).toBe('renamed.png');
  });

  it('setName adds SPOILER_ prefix when spoiler is true', () => {
    const att = new AttachmentMeta(0, 'file.png', { spoiler: true });
    att.setName('other.png');
    expect(att.filename).toBe('SPOILER_other.png');
  });

  it('setName throws for empty', () => {
    const att = new AttachmentMeta(0, 'file.png');
    expect(() => att.setName('')).toThrow('Filename is required');
  });

  it('setDescription updates description', () => {
    const att = new AttachmentMeta(0, 'file.png');
    att.setDescription('Alt text');
    expect(att.description).toBe('Alt text');
    att.setDescription(null);
    expect(att.description).toBeUndefined();
  });

  it('setSpoiler adds SPOILER_ prefix', () => {
    const att = new AttachmentMeta(0, 'file.png');
    att.setSpoiler(true);
    expect(att.spoiler).toBe(true);
    expect(att.filename).toBe('SPOILER_file.png');
  });

  it('setSpoiler removes prefix when false', () => {
    const att = new AttachmentMeta(0, 'file.png', { spoiler: true });
    att.setSpoiler(false);
    expect(att.spoiler).toBe(false);
    expect(att.filename).toBe('file.png');
  });

  it('toJSON returns API format', () => {
    const att = new AttachmentMeta(2, 'doc.pdf', { description: 'PDF document' });
    const json = att.toJSON();
    expect(json).toEqual({ id: 2, filename: 'doc.pdf', description: 'PDF document' });
  });

  it('toJSON omits description when undefined', () => {
    const att = new AttachmentMeta(0, 'image.png');
    const json = att.toJSON();
    expect(json).toEqual({ id: 0, filename: 'image.png' });
    expect(json).not.toHaveProperty('description');
  });
});
