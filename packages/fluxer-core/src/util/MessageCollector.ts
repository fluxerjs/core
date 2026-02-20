import { EventEmitter } from 'events';
import { Collection } from '@fluxerjs/collection';
import { Client } from '../client/Client.js';
import { Message } from '../structures/Message.js';
import { Events } from './Events.js';

export interface MessageCollectorOptions {
  /** Filter function. Return true to collect the message. */
  filter?: (message: Message) => boolean;
  /** Max duration in ms. Collector stops when time expires. */
  time?: number;
  /** Max messages to collect. Collector stops when limit reached. */
  max?: number;
}

export type MessageCollectorEndReason = 'time' | 'limit' | 'user';

export interface MessageCollectorEvents {
  collect: [message: Message];
  end: [collected: Collection<string, Message>, reason: MessageCollectorEndReason];
}

/**
 * Collects messages in a channel. Use channel.createMessageCollector().
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
