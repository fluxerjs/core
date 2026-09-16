import { describe, expect, it } from 'vitest';
import { ErrorCodes } from './ErrorCodes.js';
import { FluxerError } from './FluxerError.js';

describe('ErrorCodes', () => {
  it('has expected error codes', () => {
    expect(ErrorCodes.ClientNotReady).toBe('CLIENT_NOT_READY');
    expect(ErrorCodes.ChannelNotFound).toBe('CHANNEL_NOT_FOUND');
    expect(ErrorCodes.GuildNotFound).toBe('GUILD_NOT_FOUND');
    expect(ErrorCodes.EmojiNotFound).toBe('EMOJI_NOT_FOUND');
    expect(ErrorCodes.WebhookTokenRequired).toBe('WEBHOOK_TOKEN_REQUIRED');
    expect(ErrorCodes.InvalidInvite).toBe('INVALID_INVITE');
    expect(ErrorCodes.NotLoggedIn).toBe('NOT_LOGGED_IN');
    expect(ErrorCodes.InvalidEmoji).toBe('INVALID_EMOJI');
    expect(ErrorCodes.WebSocketLoadFailed).toBe('WEBSOCKET_LOAD_FAILED');
    expect(ErrorCodes.InvalidInstanceDiscovery).toBe('INVALID_INSTANCE_DISCOVERY');
    expect(ErrorCodes.ConflictingInstanceConfig).toBe('CONFLICTING_INSTANCE_CONFIG');
    expect(ErrorCodes.DuplicateRuntimeId).toBe('DUPLICATE_RUNTIME_ID');
    expect(ErrorCodes.ClusterDestroyed).toBe('CLUSTER_DESTROYED');
    expect(ErrorCodes.InvalidRuntimeConfig).toBe('INVALID_RUNTIME_CONFIG');
    expect(ErrorCodes.EmptyMessage).toBe('EMPTY_MESSAGE');
    expect(ErrorCodes.InvalidBulkDelete).toBe('INVALID_BULK_DELETE');
    expect(ErrorCodes.InvalidFetchLimit).toBe('INVALID_FETCH_LIMIT');
    expect(ErrorCodes.InvalidAttachmentInput).toBe('INVALID_ATTACHMENT_INPUT');
    expect(ErrorCodes.AttachmentTooLarge).toBe('ATTACHMENT_TOO_LARGE');
    expect(ErrorCodes.AttachmentUploadFailed).toBe('ATTACHMENT_UPLOAD_FAILED');
    expect(ErrorCodes.InvalidChannelType).toBe('INVALID_CHANNEL_TYPE');
    expect(ErrorCodes.InvalidGatewayRequest).toBe('INVALID_GATEWAY_REQUEST');
  });

  it('has all required codes', () => {
    const codes = Object.values(ErrorCodes);
    expect(codes).toContain('CLIENT_NOT_READY');
    expect(codes).toContain('INVALID_TOKEN');
    expect(codes).toContain('CHANNEL_NOT_FOUND');
    expect(codes).toContain('MESSAGE_NOT_FOUND');
  });
});

describe('FluxerError', () => {
  it('sets name, message, and code', () => {
    const err = new FluxerError('not ready', { code: ErrorCodes.ClientNotReady });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(FluxerError);
    expect(err.name).toBe('FluxerError');
    expect(err.message).toBe('not ready');
    expect(err.code).toBe('CLIENT_NOT_READY');
  });

  it('preserves cause', () => {
    const cause = new Error('root');
    const err = new FluxerError('wrapped', { code: ErrorCodes.GatewayFetchFailed, cause });
    expect(err.cause).toBe(cause);
  });

  it('isFluxerError type guard', () => {
    expect(FluxerError.isFluxerError(new FluxerError('x'))).toBe(true);
    expect(FluxerError.isFluxerError(new Error('x'))).toBe(false);
    expect(FluxerError.isFluxerError(null)).toBe(false);
  });

  it('toString includes code when present', () => {
    const err = new FluxerError('gone', { code: ErrorCodes.ChannelNotFound });
    expect(err.toString()).toBe('FluxerError [CHANNEL_NOT_FOUND]: gone');
  });
});
