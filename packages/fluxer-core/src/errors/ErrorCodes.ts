export const ErrorCodes = {
  ClientNotReady: 'CLIENT_NOT_READY',
  InvalidToken: 'INVALID_TOKEN',
  AlreadyLoggedIn: 'ALREADY_LOGGED_IN',
  /** API code: channel not found */
  ChannelNotFound: 'CHANNEL_NOT_FOUND',
  UnknownChannel: 'UNKNOWN_CHANNEL',
  /** API code: message not found */
  MessageNotFound: 'MESSAGE_NOT_FOUND',
  UnknownMessage: 'UNKNOWN_MESSAGE',
  /** API code: guild not found */
  GuildNotFound: 'GUILD_NOT_FOUND',
  UnknownGuild: 'UNKNOWN_GUILD',
  /** API code: member not found */
  MemberNotFound: 'MEMBER_NOT_FOUND',
  UnknownMember: 'UNKNOWN_MEMBER',
  /** API code: role not found */
  RoleNotFound: 'ROLE_NOT_FOUND',
  UnknownRole: 'UNKNOWN_ROLE',
  UnknownUser: 'UNKNOWN_USER',
  MissingPermissions: 'MISSING_PERMISSIONS',
  RateLimited: 'RATE_LIMITED',
  MissingAccess: 'MISSING_ACCESS',
  Unauthorized: 'UNAUTHORIZED',
  AccessDenied: 'ACCESS_DENIED',
} as const;
