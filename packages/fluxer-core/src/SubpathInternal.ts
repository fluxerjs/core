/**
 * Internal wire serializers. Prefer structure methods on domain objects.
 * Import from `@fluxerjs/core/internal` only when calling REST with raw bodies.
 */
export {
  toAttachmentUploadCompleteBody,
  toAttachmentUploadPlanBody,
  toAttachmentUploadPlanResponse,
  toBulkFetchWire,
  toChannelCreateBody,
  toChannelEditBody,
  toChannelInviteBody,
  toDiscoveryApplicationPayload,
  toDiscoveryBody,
  toDiscoveryStatusPayload,
  toEmojiCreateBody,
  toEmojiEditBody,
  toGroupDmEditBody,
  toMemberEditBody,
  toMemberSearchBody,
  toMessageAttachmentEditWire,
  toMessageSearchBody,
  toMessageSearchResponse,
  toPresenceWire,
  toProfilePayload,
  toRoleCreateBody,
  toRoleEditBody,
  toStickerCreateBody,
  toStickerEditBody,
  toSudoBody,
} from './ClientCore/SdkOptions/index.js';
