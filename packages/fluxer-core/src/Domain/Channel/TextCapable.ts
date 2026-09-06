import type { APIChannelPinsPage } from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';
import type { Client } from '../../ClientCore/Client.js';
import type { MessagePrepareInput } from '../../Helpers/MessageUtils/index.js';
import { Message } from '../Message/index.js';
import type { Channel } from './Base.js';

export type FetchPinnedMessagesOptions = { limit?: number; before?: string };

export type PinnedMessagesPage = {
  messages: Message[];
  pinnedAt: string[];
  hasMore: boolean;
};

export async function fetchPinnedMessagesPageFor(
  client: Client,
  channelId: string,
  options?: FetchPinnedMessagesOptions,
): Promise<PinnedMessagesPage> {
  const params = new URLSearchParams();
  if (options?.limit != null) params.set('limit', String(options.limit));
  if (options?.before) params.set('before', options.before);
  const qs = params.toString();
  const data = await client.rest.get<APIChannelPinsPage>(
    Routes.channelPins(channelId) + (qs ? `?${qs}` : ''),
  );
  const items = data.items ?? [];
  return {
    messages: items.map((item) => new Message(client, item.message)),
    pinnedAt: items.map((item) => item.pinned_at),
    hasMore: data.has_more ?? false,
  };
}

// Mixin ctors must use `any[]` (TS2545); narrowed at call sites via TBase.
// biome-ignore lint/suspicious/noExplicitAny: TS2545 mixin constructor constraint
type ChannelCtor = abstract new (...args: any[]) => Channel;

/** Mixin: send + pinned-message helpers for text-capable channels (guild text, voice, DMs). */
export function TextCapable<TBase extends ChannelCtor>(Base: TBase) {
  abstract class TextCapableChannel extends Base {
    /**
     * Send a message in this channel.
     * @example
     * await channel.send('hi');
     */
    async send(options: MessagePrepareInput): Promise<Message> {
      return this.client.channels.send(this.id, options);
    }

    /** Fetch pinned messages in this channel. */
    async fetchPinnedMessages(options?: FetchPinnedMessagesOptions): Promise<Message[]> {
      return (await this.fetchPinnedMessagesPage(options)).messages;
    }

    /** Fetch a page of pinned messages plus pagination metadata. */
    async fetchPinnedMessagesPage(
      options?: FetchPinnedMessagesOptions,
    ): Promise<PinnedMessagesPage> {
      return fetchPinnedMessagesPageFor(this.client, this.id, options);
    }
  }
  return TextCapableChannel;
}
