import { MessageFlags } from '@fluxerjs/types';
import { BitField, type BitFieldResolvable } from './BitField.js';

/**
 * Message flag bits for {@link MessageFlagsBitField}.
 * Values mirror `@fluxerjs/types` {@link MessageFlags} (int32 wire bitfield) as bigint.
 */
export const MessageFlagsBits = {
  SuppressEmbeds: BigInt(MessageFlags.SuppressEmbeds),
  SuppressNotifications: BigInt(MessageFlags.SuppressNotifications),
  VoiceMessage: BigInt(MessageFlags.VoiceMessage),
} as const;

export type MessageFlagsString = keyof typeof MessageFlagsBits;

export type MessageFlagsResolvable = BitFieldResolvable<MessageFlagsString>;

export class MessageFlagsBitField extends BitField<MessageFlagsString> {
  static override Flags = MessageFlagsBits;
}
