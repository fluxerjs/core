import { EventEmitter } from 'events';
import { Collection } from '@fluxerjs/collection';
import { Client } from '../client/Client.js';
import { MessageReaction } from '../structures/MessageReaction.js';
import { User } from '../structures/User.js';
import { GatewayReactionEmoji } from '@fluxerjs/types';
import { Events } from './Events.js';

export interface ReactionCollectorOptions {
  /** Filter function. Return true to collect the reaction. */
  filter?: (reaction: MessageReaction, user: User) => boolean;
  /** Max duration in ms. Collector stops when time expires. */
  time?: number;
  /** Max reactions to collect. Collector stops when limit reached. */
  max?: number;
}

export type ReactionCollectorEndReason = 'time' | 'limit' | 'user';

export interface CollectedReaction {
  reaction: MessageReaction;
  user: User;
}

export interface ReactionCollectorEvents {
  collect: [reaction: MessageReaction, user: User];
  end: [collected: Collection<string, CollectedReaction>, reason: ReactionCollectorEndReason];
}

/**
 * Collects reactions on a message. Use message.createReactionCollector().
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
  private _listener: (
    reaction: MessageReaction,
    user: User,
    _msgId: string,
    channelId: string,
    _emoji: GatewayReactionEmoji,
    userId: string,
  ) => void;

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
    this._listener = (
      reaction: MessageReaction,
      user: User,
      _msgId: string,
      chId: string,
      _emoji: GatewayReactionEmoji,
      userId: string,
    ) => {
      if (this._ended || reaction.messageId !== this.messageId || chId !== this.channelId) return;
      if (!this.options.filter(reaction, user)) return;
      const key = `${userId}:${reaction.emoji.id ?? reaction.emoji.name}`;
      this.collected.set(key, { reaction, user });
      this.emit('collect', reaction, user);
      if (this.options.max > 0 && this.collected.size >= this.options.max) {
        this.stop('limit');
      }
    };
    this.client.on(Events.MessageReactionAdd, this._listener);
    if (this.options.time > 0) {
      this._timeout = setTimeout(() => this.stop('time'), this.options.time);
    }
  }

  stop(reason: ReactionCollectorEndReason = 'user'): void {
    if (this._ended) return;
    this._ended = true;
    this.client.off(Events.MessageReactionAdd, this._listener);
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }
    this.emit('end', this.collected, reason);
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
