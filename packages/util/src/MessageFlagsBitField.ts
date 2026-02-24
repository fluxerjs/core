import { BitField, type BitFieldResolvable } from './BitField.js';

/**
 * Message flag bit values matching the API MessageFlags schema (openapi.json).
 * Format: int32.
 */
export const MessageFlagsBits = {
  SuppressEmbeds: 1n << 2n, // 4
  SuppressNotifications: 1n << 12n, // 4096
  VoiceMessage: 1n << 13n, // 8192
  CompactAttachments: 1n << 17n, // 131072
} as const;

export type MessageFlagsString = keyof typeof MessageFlagsBits;

export class MessageFlagsBitField extends BitField<MessageFlagsString> {
  static override Flags = MessageFlagsBits;
}

export type MessageFlagsResolvable = BitFieldResolvable<MessageFlagsString>;
