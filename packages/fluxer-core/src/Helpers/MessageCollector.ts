import { EventEmitter } from 'node:events';
import { Collection } from '@fluxerjs/collection';
import type { Client } from '../ClientCore/Client.js';
import type { Message } from '../Domain/Message/index.js';
import { ErrorCodes } from '../LibErrors/ErrorCodes.js';
import { FluxerError } from '../LibErrors/FluxerError.js';
import { Events } from './Events.js';

/** Options for {@link MessageCollector} / `channel.createMessageCollector()`. */
export interface MessageCollectorOptions {
  /** Filter function. Return true to collect the message. */
  filter?: (message: Message) => boolean;
  /** Max duration in ms. Collector stops when time expires. Required unless `max` is set. */
  time?: number;
  /** Max messages to collect. Collector stops when limit reached. Required unless `time` is set. */
  max?: number;
}

export type MessageCollectorEndReason = 'time' | 'limit' | 'user';

/** Typed event map for {@link MessageCollector}: `collect` per message, `end` when it stops. */
export interface MessageCollectorEvents {
  collect: [message: Message];
  end: [collected: Collection<string, Message>, reason: MessageCollectorEndReason];
}

function requireCollectorBounds(options: MessageCollectorOptions): void {
  const time = options.time ?? 0;
  const max = options.max ?? 0;
  if (time <= 0 && max <= 0) {
    throw new FluxerError('MessageCollector requires `time` and/or `max`', {
      code: ErrorCodes.CollectorOptionsRequired,
    });
  }
}

/**
 * Collects messages in a channel. Use channel.createMessageCollector().
 * Requires `time` and/or `max`.
 * @example
 * const collector = channel.createMessageCollector({ filter: m => m.author.id === userId, time: 10000 });
 * collector.on('collect', m => console.log(m.content));
 * collector.on('end', (collected, reason) => console.log(`Stopped: ${reason}`));
 */
export class MessageCollector extends EventEmitter {
  readonly client: Client;
  readonly channelId: string;
  readonly options: Required<MessageCollectorOptions>;
  readonly collected = new Collection<string, Message>();
  private _timeout: ReturnType<typeof setTimeout> | null = null;
  private _ended = false;
  private _listener: (message: Message) => void;

  constructor(client: Client, channelId: string, options: MessageCollectorOptions = {}) {
    super();
    requireCollectorBounds(options);
    this.client = client;
    this.channelId = channelId;
    this.options = {
      filter: options.filter ?? (() => true),
      time: options.time ?? 0,
      max: options.max ?? 0,
    };
    this._listener = (message: Message) => {
      if (this._ended || message.channelId !== this.channelId) return;
      if (!this.options.filter(message)) return;
      this.collected.set(message.id, message);
      this.emit('collect', message);
      if (this.options.max > 0 && this.collected.size >= this.options.max) {
        this.stop('limit');
      }
    };
    this.client.on(Events.MessageCreate, this._listener);
    if (this.options.time > 0) {
      this._timeout = setTimeout(() => this.stop('time'), this.options.time);
    }
  }

  stop(reason: MessageCollectorEndReason = 'user'): void {
    if (this._ended) return;
    this._ended = true;
    this.client.off(Events.MessageCreate, this._listener);
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }
    this.emit('end', this.collected, reason);
  }

  /**
   * One-shot helper used by {@link Channel.awaitMessages}.
   * Resolves with the collected messages when the collector ends for `user` (or when
   * the end reason is not listed in `errors`).
   * By default, `time` and `limit` reject with {@link FluxerError}
   * (`CollectorIdle` / `CollectorMax`).
   */
  static awaitMessages(
    client: Client,
    channelId: string,
    options?: MessageCollectorOptions & { errors?: MessageCollectorEndReason[] },
  ): Promise<Collection<string, Message>> {
    const errors = options?.errors ?? (['time', 'limit'] as MessageCollectorEndReason[]);
    return new Promise((resolve, reject) => {
      const collector = new MessageCollector(client, channelId, options);
      collector.on('end', (collected, reason) => {
        if (!errors.includes(reason)) {
          resolve(collected);
          return;
        }
        if (reason === 'time') {
          reject(
            new FluxerError('Message collector timed out', {
              code: ErrorCodes.CollectorIdle,
            }),
          );
          return;
        }
        if (reason === 'limit') {
          reject(
            new FluxerError('Message collector reached max', {
              code: ErrorCodes.CollectorMax,
            }),
          );
          return;
        }
        reject(collected);
      });
    });
  }

  override on<K extends keyof MessageCollectorEvents>(
    event: K,
    listener: (...args: MessageCollectorEvents[K]) => void,
  ): this {
    return super.on(event, listener as (...args: unknown[]) => void) as this;
  }

  override emit<K extends keyof MessageCollectorEvents>(
    event: K,
    ...args: MessageCollectorEvents[K]
  ): boolean {
    return super.emit(event, ...args);
  }
}
