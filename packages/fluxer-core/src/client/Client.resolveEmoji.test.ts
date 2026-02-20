import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Client } from './Client.js';

describe('Client.resolveEmoji', () => {
  let client: Client;

  beforeEach(() => {
    client = new Client();
    vi.spyOn(client.rest, 'get').mockResolvedValue([]);
  });

  it('resolves unicode shortcode :heart: to raw unicode (for URL encoding by route)', async () => {
    const result = await client.resolveEmoji(':heart:');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result).not.toMatch(/^%.*%$/); // should NOT be pre-encoded
    expect(client.rest.get).not.toHaveBeenCalled();
  });

  it('resolves object with id without guild lookup', async () => {
    const result = await client.resolveEmoji({
      name: 'custom',
      id: '123456789012345678',
    });
    expect(result).toContain('custom');
    expect(result).toContain('123456789012345678');
  });

  it('resolves name:id string format', async () => {
    const result = await client.resolveEmoji('CustomEmoji:123456789012345678');
    expect(result).toContain('CustomEmoji');
    expect(result).toContain('123456789012345678');
  });

  it('resolves <:name:id> mention format', async () => {
    const result = await client.resolveEmoji('<:custom:123456789012345678>');
    expect(result).toContain('custom');
    expect(result).toContain('123456789012345678');
  });

  it('returns raw unicode for direct unicode input', async () => {
    const result = await client.resolveEmoji('❤');
    expect(result).toBe('❤');
  });
});
