import { BitField, type BitFieldResolvable } from './BitField.js';

/**
 * Permission flags (Discord-compatible; API uses int64 permission bitfield).
 * Bits 0–30 use 1<<n; bits 31+ use 2**n so serialization (toJSON/valueOf) is correct.
 * Note: BitField uses JS bitwise ops (32-bit), so has/add/remove for bits 31+ may be unreliable.
 */
export const PermissionFlags = {
  CreateInstantInvite: 1 << 0,
  KickMembers: 1 << 1,
  BanMembers: 1 << 2,
  Administrator: 1 << 3,
  ManageChannels: 1 << 4,
  ManageGuild: 1 << 5,
  AddReactions: 1 << 6,
  ViewAuditLog: 1 << 7,
  PrioritySpeaker: 1 << 8,
  Stream: 1 << 9,
  ViewChannel: 1 << 10,
  SendMessages: 1 << 11,
  SendTtsMessages: 1 << 12,
  ManageMessages: 1 << 13,
  EmbedLinks: 1 << 14,
  AttachFiles: 1 << 15,
  ReadMessageHistory: 1 << 16,
  MentionEveryone: 1 << 17,
  UseExternalEmojis: 1 << 18,
  ViewGuildInsights: 1 << 19,
  Connect: 1 << 20,
  Speak: 1 << 21,
  MuteMembers: 1 << 22,
  DeafenMembers: 1 << 23,
  MoveMembers: 1 << 24,
  UseVad: 1 << 25,
  ChangeNickname: 1 << 26,
  ManageNicknames: 1 << 27,
  ManageRoles: 1 << 28,
  ManageWebhooks: 1 << 29,
  ManageEmojisAndStickers: 1 << 30,
  UseApplicationCommands: 2 ** 31,
  RequestToSpeak: 2 ** 32,
  ManageEvents: 2 ** 33,
  ManageThreads: 2 ** 34,
  CreatePublicThreads: 2 ** 35,
  CreatePrivateThreads: 2 ** 36,
  UseExternalStickers: 2 ** 37,
  SendMessagesInThreads: 2 ** 38,
} as const;

export type PermissionString = keyof typeof PermissionFlags;

export class PermissionsBitField extends BitField<PermissionString> {
  static override Flags = PermissionFlags;
}

export type PermissionResolvable = BitFieldResolvable<PermissionString>;
