import { Collection } from '@fluxerjs/collection';
import { Routes } from '@fluxerjs/types';
import type {
  APIBulkMessageFetchResponse,
  APIEmoji,
  APIEmojiMetadata,
  APIInstance,
  APIApplicationMe,
  APIOAuthApplication,
  APIPreloadMessagesResponse,
  APIStickerMetadata,
  APIUserTagCheck,
  APIGatewayBotResponse,
} from '@fluxerjs/types';
import { formatEmoji, getUnicodeFromShortcode, parseEmoji } from '@fluxerjs/util';
import { FluxerError } from '../errors/FluxerError.js';
import { ErrorCodes } from '../errors/ErrorCodes.js';
import { Message } from '../structures/Message.js';
import { parseInstanceDiscovery } from '../util/instance.js';
import {
  type BulkFetchMessagesOptions,
  type BulkFetchMessagesResult,
  validateBulkMessageFetchRequests,
} from './MessageManager.js';
import type { Client } from './Client.js';
import { toBulkFetchWire, type BulkFetchMessagesRequest } from './sdkOptions.js';

/**
 * Resolve an emoji argument to the API format (unicode or "name:id").
 * Supports: <:name:id>, :name:, name:id, { name, id }, unicode.
 * When id is missing (e.g. :name:), fetches guild emojis if guildId provided.
 */
export async function resolveClientEmoji(
  client: Client,
  emoji: string | { name: string; id?: string; animated?: boolean },
  guildId?: string | null,
): Promise<string> {
  if (typeof emoji === 'object' && emoji.id) {
    return formatEmoji({ name: emoji.name, id: emoji.id, animated: emoji.animated });
  }
  const parsed = parseEmoji(
    typeof emoji === 'string' ? emoji : emoji.id ? `:${emoji.name}:` : emoji.name,
  );
  if (!parsed) {
    throw new FluxerError('Invalid emoji', { code: ErrorCodes.InvalidEmoji });
  }
  if (parsed.id) {
    return formatEmoji(parsed);
  }
  if (!/^\w+$/.test(parsed.name)) return parsed.name;
  const unicodeFromShortcode = getUnicodeFromShortcode(parsed.name);
  if (unicodeFromShortcode) return unicodeFromShortcode;
  if (guildId) {
    const emojis = await client.rest.get<APIEmoji[]>(Routes.guildEmojis(guildId));
    const found = emojis.find((e) => e.name && e.name.toLowerCase() === parsed.name.toLowerCase());
    if (found) return formatEmoji({ ...parsed, id: found.id, animated: found.animated });
    throw new FluxerError(
      `Custom emoji ":${parsed.name}:" not found in guild. Use name:id or <:name:id> format.`,
      { code: ErrorCodes.EmojiNotFound },
    );
  }
  if (/^\w+$/.test(parsed.name)) {
    throw new FluxerError(
      `Custom emoji ":${parsed.name}:" requires guild context. Use message.react() in a guild channel, or pass guildId to client.resolveEmoji().`,
      { code: ErrorCodes.EmojiRequiresGuild },
    );
  }
  return parsed.name;
}

// --- Client REST helpers (co-located under T-SLIM-CLIENT write set) ---

export async function fetchInstance(client: Client): Promise<APIInstance> {
  const raw: unknown = await client.rest.get(Routes.instanceDiscovery(), { auth: false });
  return parseInstanceDiscovery(raw);
}

export function fetchGatewayInfo(client: Client): Promise<APIGatewayBotResponse> {
  return client.rest.get<APIGatewayBotResponse>(Routes.gatewayBot());
}

export function fetchEmojiMetadata(client: Client, emojiId: string): Promise<APIEmojiMetadata> {
  return client.rest.get<APIEmojiMetadata>(Routes.emojiMetadata(emojiId), { auth: true });
}

export function fetchStickerMetadata(
  client: Client,
  stickerId: string,
): Promise<APIStickerMetadata> {
  return client.rest.get<APIStickerMetadata>(Routes.stickerMetadata(stickerId), { auth: true });
}

export function fetchApplication(client: Client): Promise<APIApplicationMe> {
  return client.rest.get<APIApplicationMe>(Routes.applicationsMe(), { auth: true });
}

export async function fetchOAuthApplications(client: Client): Promise<APIOAuthApplication[]> {
  const data = await client.rest.get<
    APIOAuthApplication[] | { applications?: APIOAuthApplication[] }
  >(Routes.oauth2ApplicationsMe(), { auth: true });
  return Array.isArray(data) ? data : (data.applications ?? []);
}

export function checkUsernameTag(
  client: Client,
  username: string,
  discriminator: string,
): Promise<APIUserTagCheck> {
  const params = new URLSearchParams({ username, discriminator });
  return client.rest.get<APIUserTagCheck>(`${Routes.checkUsernameTag()}?${params}`, { auth: true });
}

function assertChannelIdBatch(name: string, channelIds: string[]): void {
  if (channelIds.length < 1 || channelIds.length > 100) {
    throw new FluxerError(`${name} requires between 1 and 100 channel IDs`, {
      code: ErrorCodes.InvalidFetchLimit,
    });
  }
}

export function preloadMessages(
  client: Client,
  channelIds: string[],
): Promise<APIPreloadMessagesResponse> {
  assertChannelIdBatch('preloadMessages', channelIds);
  return client.rest.post<APIPreloadMessagesResponse>(Routes.preloadMessages(), {
    body: { channels: channelIds },
    auth: true,
  });
}

export function preloadMessagesAlt(
  client: Client,
  channelIds: string[],
): Promise<APIPreloadMessagesResponse> {
  assertChannelIdBatch('preloadMessagesAlt', channelIds);
  return client.rest.post<APIPreloadMessagesResponse>(Routes.preloadMessagesAlt(), {
    body: { channels: channelIds },
    auth: true,
  });
}

export async function bulkFetchMessages(
  client: Client,
  requests: BulkFetchMessagesRequest[],
  options: BulkFetchMessagesOptions = {},
): Promise<BulkFetchMessagesResult | APIBulkMessageFetchResponse> {
  validateBulkMessageFetchRequests(requests);
  const wire = toBulkFetchWire(requests);
  const data = await client.rest.post<APIBulkMessageFetchResponse>(Routes.channelsMessagesBulk(), {
    body: { requests: wire },
    auth: true,
  });
  if (options.hydrate === false) return data;
  return {
    channels: data.channels.map((entry) => {
      const collection = new Collection<string, Message>();
      for (const msg of entry.messages) {
        client._addMessageToCache(entry.channel_id, msg);
        collection.set(msg.id, new Message(client, msg));
      }
      return { channelId: entry.channel_id, messages: collection };
    }),
  };
}
