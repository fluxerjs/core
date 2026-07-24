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

import { Events } from '../../util/Events.js';

import { Message } from '../../structures/Message.js';

import { MessageReaction } from '../../structures/MessageReaction.js';

import type { Client } from '../Client.js';

import type {
  MessageReactionAddManyPayload,
  MessageReactionPayload,
  MessageReactionRemoveAllPayload,
  MessageReactionRemoveEmojiPayload,
  ReactionEmojiPayload,
} from '../eventPayloads.js';

import { cacheMember, unknownUser } from './helpers.js';

import type { DispatchHandler, HandlerMap } from './types.js';

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
        ? cacheMember(client, guild, { ...data.member, guild_id: data.guild_id })
        : null;
    const user =
      member?.user ??
      client.users.get(data.user_id) ??
      client.getOrCreateUser(unknownUser(data.user_id));

    const payload: MessageReactionPayload = {
      reaction,

      user,

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
        cacheMember(client, guild, { ...data.member, user: data.author, guild_id: data.guild_id });
      }
    }

    client._addMessageToCache(data.channel_id, data);

    client.emit(Events.MessageCreate, new Message(client, data));
  },

  MESSAGE_UPDATE(client, d) {
    const partial = d as APIMessage;

    const cache = client._getMessageCache(partial.channel_id);

    let oldMessage: Message | null = null;

    let mergedData: APIMessage = partial;

    if (cache) {
      const oldData = cache.get(partial.id);

      if (oldData) {
        oldMessage = new Message(client, oldData);

        mergedData = { ...oldData, ...partial } as APIMessage;
      }

      cache.set(partial.id, mergedData);
    }

    client.emit(Events.MessageUpdate, oldMessage, new Message(client, mergedData));
  },

  MESSAGE_DELETE(client, d) {
    const data = d as GatewayMessageDeleteDispatchData;

    client._removeMessageFromCache(data.channel_id, data.id);

    client.emit(Events.MessageDelete, {
      id: data.id,

      channelId: data.channel_id,

      channel: client.channels.get(data.channel_id) ?? null,

      content: data.content ?? null,

      authorId: data.author_id ?? null,
    });
  },

  MESSAGE_DELETE_BULK(client, d) {
    const data = d as GatewayMessageDeleteBulkDispatchData;

    for (const id of data.ids ?? []) client._removeMessageFromCache(data.channel_id, id);

    client.emit(Events.MessageDeleteBulk, {
      ids: data.ids ?? [],

      channelId: data.channel_id,

      guildId: data.guild_id ?? null,
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
        member = cacheMember(client, guild, {
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

      reactions,
    };

    client.emit(Events.MessageReactionAddMany, payload);
  },
};
