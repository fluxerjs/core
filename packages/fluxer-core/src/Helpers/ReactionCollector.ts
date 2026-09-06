import { EventEmitter } from 'node:events';
import { Collection } from '@fluxerjs/collection';
import type { Client } from '../ClientCore/Client.js';
import type {
  MessageReactionAddManyPayload,
  MessageReactionPayload,
} from '../ClientCore/EventPayloads.js';
import { MessageReaction } from '../Domain/Message/MessageReaction.js';
import type { User } from '../Domain/User.js';
import { Events } from './Events.js';

/** Options for {@link ReactionCollector} / `message.createReactionCollector()`. */
export interface ReactionCollectorOptions {
  /** Filter function. Return true to collect the reaction. */
  filter?: (reaction: MessageReaction, user: User) => boolean;
  /** Max duration in ms. Collector stops when time expires. */
  time?: number;
  /** Max reactions to collect. Collector stops when limit reached. */
  max?: number;
}

export type ReactionCollectorEndReason = 'time' | 'limit' | 'user';

/** A single collected reaction paired with the user who added it. */
export interface CollectedReaction {
  reaction: MessageReaction;
  user: User;
}

/** Typed event map for {@link ReactionCollector}: `collect` per reaction, `end` when it stops. */
export interface ReactionCollectorEvents {
  collect: [reaction: MessageReaction, user: User];
  end: [collected: Collection<string, CollectedReaction>, reason: ReactionCollectorEndReason];
}

/**
 * Collects reactions on a message. Use message.createReactionCollector().
 *
 * Listens to both {@link Events.MessageReactionAdd} and {@link Events.MessageReactionAddMany}
 * (gateway may batch rapid reactions into ADD_MANY instead of individual ADD events).
 *
 * @example
 * const collector = message.createReactionCollector({ filter: (r, u) => u.id === userId, time: 10000 });
 * collector.on('collect', (reaction, user) => console.log(user.username, 'reacted', reaction.emoji.name));
 * collector.on('end', (collected, reason) => console.log(`Stopped: ${reason}`));
 */
export class ReactionCollector extends EventEmitter {
  readonly client: Client;
  readonly messageId: string;
  readonly channelId: string;
  readonly options: Required<ReactionCollectorOptions>;
  readonly collected = new Collection<string, CollectedReaction>();
  private _timeout: ReturnType<typeof setTimeout> | null = null;
  private _ended = false;
  private readonly _onAdd: (payload: MessageReactionPayload) => void;
  private readonly _onAddMany: (payload: MessageReactionAddManyPayload) => void;

  constructor(
    client: Client,
    messageId: string,
    channelId: string,
    options: ReactionCollectorOptions = {},
  ) {
    super();
    this.client = client;
    this.messageId = messageId;
    this.channelId = channelId;
    this.options = {
      filter: options.filter ?? (() => true),
      time: options.time ?? 0,
      max: options.max ?? 0,
    };

    this._onAdd = (payload: MessageReactionPayload) => {
      if (
        this._ended ||
        payload.reaction.messageId !== this.messageId ||
        payload.channelId !== this.channelId
      ) {
        return;
      }
      this._collect(payload.reaction, payload.user, payload.userId);
    };

    this._onAddMany = (payload: MessageReactionAddManyPayload) => {
      if (
        this._ended ||
        payload.messageId !== this.messageId ||
        payload.channelId !== this.channelId
      ) {
        return;
      }
      for (const entry of payload.reactions) {
        if (this._ended) return;
        const reaction = new MessageReaction(this.client, {
          message_id: payload.messageId,
          channel_id: payload.channelId,
          guild_id: payload.guildId ?? undefined,
          user_id: entry.userId,
          emoji: {
            name: entry.emoji.name,
            ...(entry.emoji.id !== undefined ? { id: entry.emoji.id } : {}),
            ...(entry.emoji.animated !== undefined ? { animated: entry.emoji.animated } : {}),
          },
        });
        const cached = this.client.users.get(entry.userId);
        const user =
          entry.member?.user ??
          cached ??
          // Ephemeral stub only; do not cache fake "Unknown" users as real Users.
          ({
            id: entry.userId,
            username: 'Unknown',
            discriminator: '0',
            globalName: null,
            avatar: null,
            bot: false,
            system: false,
          } as User);
        this._collect(reaction, user, entry.userId);
      }
    };

    this.client.on(Events.MessageReactionAdd, this._onAdd);
    this.client.on(Events.MessageReactionAddMany, this._onAddMany);
    if (this.options.time > 0) {
      this._timeout = setTimeout(() => this.stop('time'), this.options.time);
    }
  }

  private _collect(reaction: MessageReaction, user: User, userId: string): void {
    if (this._ended) return;
    if (!this.options.filter(reaction, user)) return;
    const key = `${userId}:${reaction.emoji.id ?? reaction.emoji.name}`;
    if (this.collected.has(key)) return;
    this.collected.set(key, { reaction, user });
    this.emit('collect', reaction, user);
    if (this.options.max > 0 && this.collected.size >= this.options.max) {
      this.stop('limit');
    }
  }

  stop(reason: ReactionCollectorEndReason = 'user'): void {
    if (this._ended) return;
    this._ended = true;
    this.client.off(Events.MessageReactionAdd, this._onAdd);
    this.client.off(Events.MessageReactionAddMany, this._onAddMany);
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }
    this.emit('end', this.collected, reason);
  }

  /**
   * One-shot helper used by {@link Message.awaitReactions}.
   * Resolves with the collected reactions when the collector ends.
   * Rejects if `options.errors` includes the end reason.
   */
  static awaitReactions(
    client: Client,
    messageId: string,
    channelId: string,
    options?: ReactionCollectorOptions & { errors?: ReactionCollectorEndReason[] },
  ): Promise<Collection<string, CollectedReaction>> {
    const errors = options?.errors ?? [];
    return new Promise((resolve, reject) => {
      const collector = new ReactionCollector(client, messageId, channelId, options);
      collector.on('end', (collected, reason) => {
        if (errors.includes(reason)) reject(collected);
        else resolve(collected);
      });
    });
  }

  override on<K extends keyof ReactionCollectorEvents>(
    event: K,
    listener: (...args: ReactionCollectorEvents[K]) => void,
  ): this {
    return super.on(event, listener as (...args: unknown[]) => void) as this;
  }

  override emit<K extends keyof ReactionCollectorEvents>(
    event: K,
    ...args: ReactionCollectorEvents[K]
  ): boolean {
    return super.emit(event, ...args);
  }
}
