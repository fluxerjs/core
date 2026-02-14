import { BitField, type BitFieldResolvable } from './BitField.js';

/**
 * User flag bit values matching the API UserFlags schema (openapi.json).
 * Values are int64; bit shifts used where within 32-bit range, literals otherwise.
 * Note: BitField's has/add/remove use JS bitwise ops (32-bit); full values are for API serialization.
 */
export const UserFlagsBits = {
  Staff: 1 << 0,
  CtpMember: 1 << 1,
  Partner: 1 << 2,
  BugHunter: 1 << 3,
  FriendlyBot: 1 << 4,
  FriendlyBotManualApproval: 1 << 5,
  HighGlobalRateLimit: 8_589_934_592,
  Deleted: 17_179_869_184,
  DisabledSuspiciousActivity: 34_359_738_368,
  SelfDeleted: 68_719_476_736,
  PremiumDiscriminator: 137_438_953_472,
  Disabled: 274_877_906_944,
  HasSessionStarted: 549_755_813_888,
  PremiumBadgeHidden: 1_099_511_627_776,
  PremiumBadgeMasked: 2_199_023_255_552,
  PremiumBadgeTimestampHidden: 4_398_046_511_104,
  PremiumBadgeSequenceHidden: 8_796_093_022_208,
  PremiumPerksSanitized: 17_592_186_044_416,
  PremiumPurchaseDisabled: 35_184_372_088_832,
  PremiumEnabledOverride: 70_368_744_177_664,
  RateLimitBypass: 140_737_488_355_328,
  ReportBanned: 281_474_976_710_656,
  VerifiedNotUnderage: 562_949_953_421_312,
  PendingManualVerification: 1_125_899_906_842_624,
  HasDismissedPremiumOnboarding: 2_251_799_813_685_248,
  UsedMobileClient: 4_503_599_627_370_496,
  // API int64 flags >= 2^53 (use exponentiation to avoid precision-loss lint).
  AppStoreReviewer: 2 ** 53,
  DmHistoryBackfilled: 2 ** 54,
  HasRelationshipsIndexed: 2 ** 55,
  MessagesByAuthorBackfilled: 2 ** 56,
  StaffHidden: 2 ** 57,
} as const;

export type UserFlagsString = keyof typeof UserFlagsBits;

export class UserFlagsBitField extends BitField<UserFlagsString> {
  static override Flags = UserFlagsBits;
}

export type UserFlagsResolvable = BitFieldResolvable<UserFlagsString>;
