/**
 * API error codes returned by the Fluxer API.
 * Subset of commonly used codes for bot development.
 */
export enum APIErrorCode {
  // Auth
  Unauthorized = 'UNAUTHORIZED',
  Forbidden = 'FORBIDDEN',
  MissingAuthorization = 'MISSING_AUTHORIZATION',
  InvalidAuthToken = 'INVALID_AUTH_TOKEN',
  InvalidToken = 'INVALID_TOKEN',
  TwoFactorRequired = 'TWO_FACTOR_REQUIRED',
  SudoModeRequired = 'SUDO_MODE_REQUIRED',

  // Not found
  NotFound = 'NOT_FOUND',
  UnknownUser = 'UNKNOWN_USER',
  UnknownGuild = 'UNKNOWN_GUILD',
  UnknownChannel = 'UNKNOWN_CHANNEL',
  UnknownMessage = 'UNKNOWN_MESSAGE',
  UnknownRole = 'UNKNOWN_ROLE',
  UnknownEmoji = 'UNKNOWN_EMOJI',
  UnknownSticker = 'UNKNOWN_STICKER',
  UnknownWebhook = 'UNKNOWN_WEBHOOK',
  UnknownInvite = 'UNKNOWN_INVITE',

  // Validation
  BadRequest = 'BAD_REQUEST',
  ValidationError = 'VALIDATION_ERROR',
  InvalidRequest = 'INVALID_REQUEST',
  InvalidFormBody = 'INVALID_FORM_BODY',

  // Rate limit
  RateLimited = 'RATE_LIMITED',
  SlowmodeRateLimited = 'SLOWMODE_RATE_LIMITED',

  // Server
  InternalServerError = 'INTERNAL_SERVER_ERROR',
  BadGateway = 'BAD_GATEWAY',
  GatewayTimeout = 'GATEWAY_TIMEOUT',
  ServiceUnavailable = 'SERVICE_UNAVAILABLE',

  // Bot-specific
  BotsCannotSendFriendRequests = 'BOTS_CANNOT_SEND_FRIEND_REQUESTS',
  BotAlreadyInGuild = 'BOT_ALREADY_IN_GUILD',
  BotApplicationNotFound = 'BOT_APPLICATION_NOT_FOUND',
  BotIsPrivate = 'BOT_IS_PRIVATE',
  NotABotApplication = 'NOT_A_BOT_APPLICATION',

  // Content
  CannotSendEmptyMessage = 'CANNOT_SEND_EMPTY_MESSAGE',
  FileSizeTooLarge = 'FILE_SIZE_TOO_LARGE',
  MaxEmojis = 'MAX_EMOJIS',
  MaxStickers = 'MAX_STICKERS',
  MaxWebhooks = 'MAX_WEBHOOKS',
}

export interface APIErrorBody {
  code: APIErrorCode | string;
  message: string;
  errors?: Array<{ path: string; message: string; code?: string }>;
}

export interface RateLimitErrorBody extends APIErrorBody {
  code: 'RATE_LIMITED';
  retry_after: number;
  global?: boolean;
}
