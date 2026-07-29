import { Request } from 'undici';
import { describe, expect, it } from 'vitest';
import { buildFormData } from './files.js';

describe('buildFormData', () => {
  it('creates FormData with payload_json only', () => {
    const payload = { content: 'Hello' };
    const form = buildFormData(payload);
    expect(form.get('payload_json')).toBe(JSON.stringify(payload));
    expect(form.get('files[0]')).toBeNull();
  });

  it('adds files with auto-generated attachments metadata', () => {
    const payload = { content: 'With file' };
    const files = [{ name: 'test.txt', data: new Uint8Array([1, 2, 3]) }];
    const form = buildFormData(payload, files);
    expect(form.get('payload_json')).toBeTruthy();
    const parsed = JSON.parse(form.get('payload_json') as string);
    expect(parsed.attachments).toEqual([{ id: 0, filename: 'test.txt' }]);
    expect(form.get('files[0]')).toBeTruthy();
  });

  it('uses custom filename when provided', () => {
    const payload = {};
    const files = [{ name: 'a', data: new Uint8Array(), filename: 'custom.png' }];
    const form = buildFormData(payload, files);
    const parsed = JSON.parse(form.get('payload_json') as string);
    expect(parsed.attachments).toEqual([{ id: 0, filename: 'custom.png' }]);
  });

  it('preserves existing attachments when files provided', () => {
    const payload = { attachments: [{ id: 0, filename: 'existing.png', description: 'desc' }] };
    const files = [{ name: 'x', data: new Uint8Array() }];
    const form = buildFormData(payload, files);
    const parsed = JSON.parse(form.get('payload_json') as string);
    expect(parsed.attachments[0].description).toBe('desc');
  });

  it('serializes as multipart with undici', async () => {
    const form = buildFormData({ content: 'With file' }, [
      { name: 'test.txt', data: new Uint8Array([1, 2, 3]) },
    ]);
    const request = new Request('https://example.com', { method: 'POST', body: form });

    expect(request.headers.get('content-type')).toMatch(/^multipart\/form-data; boundary=/);
    expect(await request.text()).toContain('name="payload_json"');
  });
});
