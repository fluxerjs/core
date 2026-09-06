import { AttachmentBuilder, EmbedBuilder, MessagePayload } from '@fluxerjs/builders';
import type { APIAllowedMentions, APIMessageReference } from '@fluxerjs/types';
import { MessageAttachmentFlags, MessageReferenceType } from '@fluxerjs/types';
import { ErrorCodes } from '../../LibErrors/ErrorCodes.js';
import { FluxerError } from '../../LibErrors/FluxerError.js';
import { resolveMessageFiles } from './Files.js';
import type {
  AllowedMentionsOptions,
  MessageAttachmentMeta,
  MessageFileData,
  MessagePostPayload,
  MessageReplyTarget,
  MessageSendOptions,
  SendBodyResult,
} from './Types.js';

/** Optional client defaults applied when a send omits the matching field. */
export type MessagePrepareDefaults = {
  defaultAllowedMentions?: AllowedMentionsOptions;
};

/** Convert SDK allowed-mentions options to the API request shape. */
export function toAPIAllowedMentions(options: AllowedMentionsOptions): APIAllowedMentions {
  const result: APIAllowedMentions = {};
  if (options.parse !== undefined) result.parse = options.parse;
  if (options.users?.length) result.users = options.users;
  if (options.roles?.length) result.roles = options.roles;
  if (options.repliedUser !== undefined) result.replied_user = options.repliedUser;
  return result;
}

/** Apply reply ping suppression — Fluxer uses `allowed_mentions.replied_user` only. */
export function applyReplyPingSuppression(body: SendBodyResult): void {
  body.allowed_mentions = {
    ...(body.allowed_mentions ?? {}),
    replied_user: false,
  };
}

function assignIfDefined<T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: T[K] | undefined,
): void {
  if (value !== undefined) target[key] = value;
}

function normalizeSendFiles(
  files: Array<MessageFileData | AttachmentBuilder> | undefined,
): { files: MessageFileData[]; metaFromBuilders: MessageAttachmentMeta[] } | undefined {
  if (!files?.length) return undefined;
  const normalized: MessageFileData[] = [];
  const metaFromBuilders: MessageAttachmentMeta[] = [];
  let anyBuilderMeta = false;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file) continue;
    if (file instanceof AttachmentBuilder) {
      normalized.push(file.toFileData());
      const meta: MessageAttachmentMeta = {
        id: i,
        filename: file.filename,
        ...(file.description != null ? { description: file.description } : {}),
        ...(file.spoiler ? { flags: MessageAttachmentFlags.IS_SPOILER } : {}),
      };
      if (file.description != null || file.spoiler) anyBuilderMeta = true;
      metaFromBuilders.push(meta);
    } else {
      normalized.push(file);
      metaFromBuilders.push({
        id: i,
        filename: file.filename ?? file.name,
      });
    }
  }
  return {
    files: normalized,
    metaFromBuilders: anyBuilderMeta ? metaFromBuilders : [],
  };
}

/** Build API-ready body from send options (excludes reply routing fields). */
export function buildSendBody(options: string | MessageSendOptions): SendBodyResult {
  const body = typeof options === 'string' ? { content: options } : options;
  const result: SendBodyResult = {};
  assignIfDefined(result, 'content', body.content);
  if (body.embeds?.length) {
    result.embeds = body.embeds.map((e) => (e instanceof EmbedBuilder ? e.toJSON() : e));
  }
  const normalizedFiles = normalizeSendFiles(body.files);
  if (body.uploadedAttachments?.length) {
    result.attachments = body.uploadedAttachments;
  } else if (normalizedFiles?.files.length) {
    result.attachments = body.attachments?.length
      ? body.attachments.map((a) => ({
          id: a.id,
          filename: a.filename,
          ...(a.title != null && { title: a.title }),
          ...(a.description != null && { description: a.description }),
          ...(a.flags != null && { flags: a.flags }),
        }))
      : normalizedFiles.metaFromBuilders.length
        ? normalizedFiles.metaFromBuilders
        : normalizedFiles.files.map((f, i) => ({ id: i, filename: f.filename ?? f.name }));
  }
  if (body.allowedMentions) result.allowed_mentions = toAPIAllowedMentions(body.allowedMentions);
  if (body.stickerIds?.length) result.sticker_ids = body.stickerIds;
  assignIfDefined(result, 'nonce', body.nonce);
  assignIfDefined(result, 'favorite_meme_id', body.favoriteMemeId);
  assignIfDefined(result, 'tts', body.tts);
  assignIfDefined(result, 'flags', body.flags);
  return result;
}

function toMessageReference(target: MessageReplyTarget, forceForward = false): APIMessageReference {
  const ref: APIMessageReference = {
    channel_id: target.channelId,
    message_id: target.messageId,
  };
  if (target.guildId) ref.guild_id = target.guildId;
  const type = forceForward
    ? MessageReferenceType.Forward
    : (target.type ?? MessageReferenceType.Default);
  if (type !== MessageReferenceType.Default) ref.type = type;
  if (target.attachmentIds?.length) ref.attachment_ids = target.attachmentIds;
  if (target.embedIndices?.length) ref.embed_indices = target.embedIndices;
  return ref;
}

function shouldSuppressReplyPing(
  ping: boolean | undefined,
  allowedMentions: AllowedMentionsOptions | undefined,
  body: SendBodyResult,
): boolean {
  return (
    ping === false ||
    allowedMentions?.repliedUser === false ||
    body.allowed_mentions?.replied_user === false
  );
}

/**
 * Map a builders {@link MessagePayload} into camelCase {@link MessageSendOptions}.
 * Prefer `channel.send(options)` / this helper over posting `toJSON()` directly.
 */
export function messagePayloadToSendOptions(payload: MessagePayload): MessageSendOptions {
  const json = payload.toJSON();
  const options: MessageSendOptions = {};
  if (json.content != null) options.content = json.content;
  if (json.embeds?.length) options.embeds = json.embeds;
  if (json.tts !== undefined) options.tts = json.tts;
  if (json.flags !== undefined) options.flags = json.flags;
  if (json.allowed_mentions) {
    options.allowedMentions = {
      parse: json.allowed_mentions.parse,
      users: json.allowed_mentions.users,
      roles: json.allowed_mentions.roles,
      repliedUser: json.allowed_mentions.replied_user,
    };
  }
  if (json.message_reference?.channel_id && json.message_reference.message_id) {
    options.replyTo = {
      channelId: json.message_reference.channel_id,
      messageId: json.message_reference.message_id,
      guildId: json.message_reference.guild_id,
    };
  }
  if (json.attachments?.length) {
    options.attachments = json.attachments.map((a) => ({
      id: a.id,
      filename: a.filename,
      description: a.description ?? undefined,
    }));
  }
  return options;
}

/** Input accepted by {@link prepareMessagePostPayload} and channel send helpers. */
export type MessagePrepareInput = string | MessageSendOptions | MessagePayload;

/**
 * Build a full message POST payload (body + optional files) from send options
 * or a builders {@link MessagePayload}.
 * Applies {@link MessagePrepareDefaults.defaultAllowedMentions} when the call omits `allowedMentions`.
 */
export async function prepareMessagePostPayload(
  options: MessagePrepareInput,
  defaults?: MessagePrepareDefaults,
): Promise<MessagePostPayload> {
  let normalized: string | MessageSendOptions =
    options instanceof MessagePayload ? messagePayloadToSendOptions(options) : options;

  if (typeof normalized === 'string') {
    if (normalized.length === 0) {
      throw new FluxerError('Cannot send an empty message', { code: ErrorCodes.EmptyMessage });
    }
    normalized = { content: normalized };
  } else {
    normalized = { ...normalized };
    if (!normalized.allowedMentions && defaults?.defaultAllowedMentions) {
      normalized.allowedMentions = defaults.defaultAllowedMentions;
    }
  }

  const { replyTo, forward, ping, files, allowedMentions, uploadedAttachments, ...sendFields } =
    normalized;
  if (files?.length && uploadedAttachments?.length) {
    throw new FluxerError('Cannot combine multipart files with uploadedAttachments', {
      code: ErrorCodes.InvalidMessageOptions,
    });
  }
  if (replyTo && forward) {
    throw new FluxerError('Cannot combine replyTo and forward', {
      code: ErrorCodes.InvalidMessageOptions,
    });
  }

  const body = buildSendBody({ ...sendFields, files, allowedMentions, uploadedAttachments });

  if (forward) {
    if (!forward.channelId || !forward.messageId) {
      throw new FluxerError('forward requires channelId and messageId', {
        code: ErrorCodes.InvalidMessageOptions,
      });
    }
    body.message_reference = toMessageReference(forward, true);
  } else if (replyTo) {
    body.message_reference = toMessageReference(replyTo);
    if (shouldSuppressReplyPing(ping, allowedMentions, body)) applyReplyPingSuppression(body);
  } else if (allowedMentions?.repliedUser === false) {
    applyReplyPingSuppression(body);
  }

  const resolvedFiles = normalizeSendFiles(files);

  return {
    body,
    files:
      !uploadedAttachments?.length && resolvedFiles?.files.length
        ? await resolveMessageFiles(resolvedFiles.files)
        : undefined,
  };
}
