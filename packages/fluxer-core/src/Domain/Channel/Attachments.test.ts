import { describe, expect, it, vi } from 'vitest';
import { Client } from '../../ClientCore/Client.js';
import { ErrorCodes } from '../../LibErrors/ErrorCodes.js';
import { FluxerError } from '../../LibErrors/FluxerError.js';
import { createTestClient, fixtureInstance } from '../../TestKit/Fixtures.js';
import {
  ATTACHMENT_MULTIPART_THRESHOLD_BYTES,
  BOT_ATTACHMENT_MAX_BYTES,
  instanceLimitOverridesSnapshot,
  uploadAttachmentsForSend,
} from './Attachments.js';

function oversizedFile(filename = 'huge.bin') {
  return {
    id: 0,
    filename,
    data: { byteLength: BOT_ATTACHMENT_MAX_BYTES + 1 } as unknown as Uint8Array,
    contentType: 'application/octet-stream',
  };
}

describe('uploadAttachmentsForSend bot limits', () => {
  it('exports the documented 50 MiB ceiling and 10 MiB multipart split', () => {
    expect(BOT_ATTACHMENT_MAX_BYTES).toBe(50 * 1024 * 1024);
    expect(ATTACHMENT_MULTIPART_THRESHOLD_BYTES).toBe(10 * 1024 * 1024);
  });

  it('fails fast before the plan POST when a file exceeds 50 MiB', async () => {
    const client = createTestClient();
    const post = vi.spyOn(client.rest, 'post');
    await expect(
      uploadAttachmentsForSend(client, 'c1', [oversizedFile('clip.mp4')]),
    ).rejects.toMatchObject({
      code: ErrorCodes.AttachmentTooLarge,
    });
    await expect(
      uploadAttachmentsForSend(client, 'c1', [oversizedFile('clip.mp4')]),
    ).rejects.toThrow(/50 MiB.*clip\.mp4/);
    expect(post).not.toHaveBeenCalled();
  });

  it('includes instance limit overrides in the error when discovery is present', async () => {
    const client = new Client({
      gatewayDeferHandlers: false,
      instance: fixtureInstance({
        limits: {
          version: 2,
          traitDefinitions: [],
          defaultsHash: 'h',
          rules: [{ id: 'premium', overrides: { max_file_size: 104_857_600 } }],
        },
      }),
    });
    expect(instanceLimitOverridesSnapshot(client)).toEqual({ max_file_size: 104_857_600 });
    await expect(uploadAttachmentsForSend(client, 'c1', [oversizedFile()])).rejects.toBeInstanceOf(
      FluxerError,
    );
    await expect(uploadAttachmentsForSend(client, 'c1', [oversizedFile()])).rejects.toThrow(
      /Instance limit overrides: \{"max_file_size":104857600\}/,
    );
  });

  it('allows files at or under the 50 MiB ceiling to reach the plan request', async () => {
    const client = createTestClient();
    const post = vi.spyOn(client.rest, 'post').mockResolvedValue({ attachments: [] });
    const ok = {
      id: 0,
      filename: 'ok.bin',
      data: new Uint8Array(4),
      contentType: 'application/octet-stream',
    };
    await uploadAttachmentsForSend(client, 'c1', [ok]);
    expect(post).toHaveBeenCalled();
  });
});
