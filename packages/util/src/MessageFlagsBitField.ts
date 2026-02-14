import { BitField, type BitFieldResolvable } from './BitField.js';

/**
 * Message flag bit values matching the API MessageFlags schema (openapi.json).
 * Format: int32.
 */
export const MessageFlagsBits = {
  SuppressEmbeds: 1 << 2, // 4
  SuppressNotifications: 1 << 12, // 4096
  VoiceMessage: 1 << 13, // 8192
  CompactAttachments: 1 << 17, // 131072
} as const;

export type MessageFlagsString = keyof typeof MessageFlagsBits;

export class MessageFlagsBitField extends BitField<MessageFlagsString> {
  static override Flags = MessageFlagsBits;
}

export type MessageFlagsResolvable = BitFieldResolvable<MessageFlagsString>;
