/**
 * Stable machine-readable error codes for {@link FluxerError}.
 * Keys are PascalCase; values are SCREAMING_SNAKE.
 */
export const ErrorCodes = {
  ClientNotReady: 'CLIENT_NOT_READY',
  NotLoggedIn: 'NOT_LOGGED_IN',
  InvalidToken: 'INVALID_TOKEN',
  AlreadyLoggedIn: 'ALREADY_LOGGED_IN',
  ChannelNotFound: 'CHANNEL_NOT_FOUND',
  MessageNotFound: 'MESSAGE_NOT_FOUND',
  GuildNotFound: 'GUILD_NOT_FOUND',
  MemberNotFound: 'MEMBER_NOT_FOUND',
  RoleNotFound: 'ROLE_NOT_FOUND',
  EmojiNotInGuild: 'EMOJI_NOT_IN_GUILD',
  EmojiNotFound: 'EMOJI_NOT_FOUND',
  InvalidEmoji: 'INVALID_EMOJI',
  EmojiRequiresGuild: 'EMOJI_REQUIRES_GUILD',
  WebhookTokenRequired: 'WEBHOOK_TOKEN_REQUIRED',
  InvalidInvite: 'INVALID_INVITE',
  InvalidFileUrl: 'INVALID_FILE_URL',
  FileFetchFailed: 'FILE_FETCH_FAILED',
  InvalidAttachment: 'INVALID_ATTACHMENT',
  WebSocketLoadFailed: 'WEBSOCKET_LOAD_FAILED',
  GatewayConnectionAborted: 'GATEWAY_CONNECTION_ABORTED',
  GatewayFetchFailed: 'GATEWAY_FETCH_FAILED',
  AttachmentFilenameRequired: 'ATTACHMENT_FILENAME_REQUIRED',
  InvalidEmbedMediaUrl: 'INVALID_EMBED_MEDIA_URL',
  InvalidEmbedUrl: 'INVALID_EMBED_URL',
  VoiceWebSocketRequired: 'VOICE_WEBSOCKET_REQUIRED',
  VoiceHttpError: 'VOICE_HTTP_ERROR',
  VoiceNoResponseBody: 'VOICE_NO_RESPONSE_BODY',
  InvalidInstanceDiscovery: 'INVALID_INSTANCE_DISCOVERY',
  ConflictingInstanceConfig: 'CONFLICTING_INSTANCE_CONFIG',
  /** @beta ClientCluster: duplicate runtime id */
  DuplicateRuntimeId: 'DUPLICATE_RUNTIME_ID',
  /** @beta ClientCluster: unknown runtime id */
  RuntimeNotFound: 'RUNTIME_NOT_FOUND',
  /** @beta ClientCluster: concurrent conflicting op on same id */
  RuntimeConflict: 'RUNTIME_CONFLICT',
  /** @beta ClientCluster: cluster already destroyed */
  ClusterDestroyed: 'CLUSTER_DESTROYED',
  /** @beta ClientCluster: prebuilt client already logged in */
  RuntimeAlreadyLoggedIn: 'RUNTIME_ALREADY_LOGGED_IN',
  /** @beta ClientCluster: missing/empty runtime id or token */
  InvalidRuntimeConfig: 'INVALID_RUNTIME_CONFIG',
  EmptyMessage: 'EMPTY_MESSAGE',
  InvalidMessageOptions: 'INVALID_MESSAGE_OPTIONS',
  InvalidBulkDelete: 'INVALID_BULK_DELETE',
  /** Fetch / bulk-fetch limit or batch size out of range. */
  InvalidFetchLimit: 'INVALID_FETCH_LIMIT',
  /** Attachment plan/file mismatch or invalid attachment input. */
  InvalidAttachmentInput: 'INVALID_ATTACHMENT_INPUT',
  /** Presigned CDN PUT failed. */
  AttachmentUploadFailed: 'ATTACHMENT_UPLOAD_FAILED',
  /** Operation requires a personal-notes channel (or wrong channel type). */
  InvalidChannelType: 'INVALID_CHANNEL_TYPE',
  /** Gateway opcode payload missing required fields. */
  InvalidGatewayRequest: 'INVALID_GATEWAY_REQUEST',
  /** Collector ended because its time limit elapsed. */
  CollectorIdle: 'COLLECTOR_IDLE',
  /** Collector ended because its max item limit was reached. */
  CollectorMax: 'COLLECTOR_MAX',
  /** Collector requires `time` and/or `max`. */
  CollectorOptionsRequired: 'COLLECTOR_OPTIONS_REQUIRED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
