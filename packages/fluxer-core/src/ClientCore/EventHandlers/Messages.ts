import type {
  APIGuildMember,
  APIMessage,
  GatewayMessageDeleteBulkDispatchData,
  GatewayMessageDeleteDispatchData,
  GatewayMessageReactionAddDispatchData,
  GatewayMessageReactionAddManyDispatchData,
  GatewayMessageReactionRemoveAllDispatchData,
  GatewayMessageReactionRemoveDispatchData,
  GatewayMessageReactionRemoveEmojiDispatchData,
  GatewayReactionEmoji,
} from '@fluxerjs/types';
import { SnowflakeUtil } from '@fluxerjs/util';
import type { TextBasedChannel } from '../../Domain/Channel/index.js';
import { Message } from '../../Domain/Message/index.js';
import { MessageReaction } from '../../Domain/Message/MessageReaction.js';
import { PartialMessage } from '../../Domain/Message/PartialMessage.js';
import { Events } from '../../Helpers/Events.js';

import type { Client } from '../Client.js';

import type {
  MessageReactionAddManyPayload,
  MessageReactionPayload,
  MessageReactionRemoveAllPayload,
  MessageReactionRemoveEmojiPayload,
  ReactionEmojiPayload,
} from '../EventPayloads.js';

import { indexMember, unknownUser } from './Helpers.js';

import type { DispatchHandler, HandlerMap } from './Types.js';

function cachedTextChannel(client: Client, channelId: string): TextBasedChannel | null {
  const channel = client.channels.get(channelId);
  return channel?.isTextBased() ? channel : null;
}

function cachedMessage(client: Client, channelId: string, messageId: string): Message | null {
  const data = client._getMessageCache(channelId)?.get(messageId);
  return data ? new Message(client, data) : null;
}

function isHydratableMessage(data: APIMessage): boolean {
  return Boolean(data.author?.id && data.timestamp);
}

function toPartialMessage(
  client: Client,
  args: {
    id: string;
    channelId: string;
    guildId?: string | null;
    content?: string | null;
    authorId?: string | null;
    cached?: APIMessage;
  },
): PartialMessage {
  const cached = args.cached;
  const authorId = args.authorId ?? cached?.author?.id ?? null;
  const author = cached?.author
    ? client.getOrCreateUser(cached.author)
    : authorId
      ? (client.users.get(authorId) ?? null)
      : null;
  const createdAt = cached?.timestamp
    ? new Date(cached.timestamp)
    : SnowflakeUtil.isValid(args.id)
      ? SnowflakeUtil.dateFromSnowflake(args.id)
      : null;

  return new PartialMessage(client, {
    id: args.id,
    channelId: args.channelId,
    guildId: args.guildId ?? cached?.guild_id ?? null,
    channel: cachedTextChannel(client, args.channelId),
    content: args.content ?? cached?.content ?? null,
    authorId,
    author,
    createdAt,
  });
}

function toReactionEmoji(emoji: GatewayReactionEmoji): ReactionEmojiPayload {
  return {
    name: emoji.name,
    ...(emoji.id !== undefined ? { id: emoji.id } : {}),
    ...(emoji.animated !== undefined ? { animated: emoji.animated } : {}),
  };
}

function emitReaction(event: string): DispatchHandler {
  return (client: Client, d: unknown): void => {
    const data = d as
      | GatewayMessageReactionAddDispatchData
      | GatewayMessageReactionRemoveDispatchData;

    const reaction = new MessageReaction(client, data);

    const guild = data.guild_id ? client.guilds.get(data.guild_id) : undefined;
    const member =
      guild && data.member
        ? indexMember(client, guild, { ...data.member, guild_id: data.guild_id })
        : null;
    const user =
      member?.user ??
      client.users.get(data.user_id) ??
      client.getOrCreateUser(unknownUser(data.user_id));

    const payload: MessageReactionPayload = {
      reaction,
      user,
      message: cachedMessage(client, data.channel_id, data.message_id),
      channel: cachedTextChannel(client, data.channel_id),
      member,
      messageId: data.message_id,
      channelId: data.channel_id,
      emoji: toReactionEmoji(data.emoji),
      userId: data.user_id,
    };

    client.emit(event, payload);
  };
}

export const messageHandlers: HandlerMap = {
  MESSAGE_CREATE(client, d) {
    const data = d as APIMessage & { member?: APIGuildMember };

    if (data.guild_id && data.member && data.author) {
      const guild = client.guilds.get(data.guild_id);

      if (guild) {
        indexMember(client, guild, { ...data.member, user: data.author, guild_id: data.guild_id });
      }
    }

    client._addMessageToCache(data.channel_id, data);

    client.emit(Events.MessageCreate, new Message(client, data));
  },

  MESSAGE_UPDATE(client, d) {
    const partial = d as APIMessage;
    const oldData = client._getMessageCache(partial.channel_id)?.get(partial.id);
    const oldMessage = oldData ? new Message(client, oldData) : null;
    const mergedData = (oldData ? { ...oldData, ...partial } : partial) as APIMessage;

    if (isHydratableMessage(mergedData)) {
      client._addMessageToCache(partial.channel_id, mergedData);
      client.emit(Events.MessageUpdate, oldMessage, new Message(client, mergedData));
      return;
    }

    client.emit(
      Events.MessageUpdate,
      oldMessage,
      toPartialMessage(client, {
        id: partial.id,
        channelId: partial.channel_id,
        guildId: partial.guild_id ?? oldData?.guild_id ?? null,
        content: partial.content ?? oldData?.content ?? null,
        authorId: partial.author?.id ?? oldData?.author?.id ?? null,
        cached: oldData,
      }),
    );
  },

  MESSAGE_DELETE(client, d) {
    const data = d as GatewayMessageDeleteDispatchData;
    const cached = client._getMessageCache(data.channel_id)?.get(data.id);
    const payload = toPartialMessage(client, {
      id: data.id,
      channelId: data.channel_id,
      guildId: data.guild_id ?? cached?.guild_id ?? null,
      content: data.content ?? cached?.content ?? null,
      authorId: data.author_id ?? cached?.author?.id ?? null,
      cached,
    });

    client._removeMessageFromCache(data.channel_id, data.id);
    client.emit(Events.MessageDelete, payload);
  },

  MESSAGE_DELETE_BULK(client, d) {
    const data = d as GatewayMessageDeleteBulkDispatchData;
    const ids = data.ids ?? [];
    const cache = client._getMessageCache(data.channel_id);
    const messages = ids.map((id) =>
      toPartialMessage(client, {
        id,
        channelId: data.channel_id,
        guildId: data.guild_id ?? cache?.get(id)?.guild_id ?? null,
        cached: cache?.get(id),
      }),
    );

    for (const id of ids) client._removeMessageFromCache(data.channel_id, id);

    client.emit(Events.MessageDeleteBulk, {
      ids,
      channelId: data.channel_id,
      guildId: data.guild_id ?? null,
      channel: cachedTextChannel(client, data.channel_id),
      messages,
    });
  },

  MESSAGE_REACTION_ADD: emitReaction(Events.MessageReactionAdd),

  MESSAGE_REACTION_REMOVE: emitReaction(Events.MessageReactionRemove),

  MESSAGE_REACTION_REMOVE_ALL(client, d) {
    const data = d as GatewayMessageReactionRemoveAllDispatchData;

    const payload: MessageReactionRemoveAllPayload = {
      messageId: data.message_id,
      channelId: data.channel_id,
      guildId: data.guild_id ?? null,
      message: cachedMessage(client, data.channel_id, data.message_id),
      channel: cachedTextChannel(client, data.channel_id),
    };

    client.emit(Events.MessageReactionRemoveAll, payload);
  },

  MESSAGE_REACTION_REMOVE_EMOJI(client, d) {
    const data = d as GatewayMessageReactionRemoveEmojiDispatchData;

    const payload: MessageReactionRemoveEmojiPayload = {
      messageId: data.message_id,
      channelId: data.channel_id,
      guildId: data.guild_id ?? null,
      emoji: toReactionEmoji(data.emoji),
      message: cachedMessage(client, data.channel_id, data.message_id),
      channel: cachedTextChannel(client, data.channel_id),
    };

    client.emit(Events.MessageReactionRemoveEmoji, payload);
  },

  MESSAGE_REACTION_ADD_MANY(client, d) {
    const data = d as GatewayMessageReactionAddManyDispatchData;

    const guild = data.guild_id ? client.guilds.get(data.guild_id) : undefined;

    const reactions = [];

    for (const entry of data.reactions ?? []) {
      let member = null;

      if (guild && entry.member?.user?.id) {
        member = indexMember(client, guild, {
          ...entry.member,
          user: entry.member.user,
          guild_id: data.guild_id,
        } as unknown as APIGuildMember);
      }

      reactions.push({
        userId: entry.user_id,
        emoji: toReactionEmoji(entry.emoji),
        member,
      });
    }

    const payload: MessageReactionAddManyPayload = {
      channelId: data.channel_id,
      messageId: data.message_id,
      guildId: data.guild_id ?? null,
      message: cachedMessage(client, data.channel_id, data.message_id),
      channel: cachedTextChannel(client, data.channel_id),
      reactions,
    };

    client.emit(Events.MessageReactionAddMany, payload);
  },
};
