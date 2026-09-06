import { Collection } from '@fluxerjs/collection';
import type { APIMessageReaction } from '@fluxerjs/types';
import { MessageReaction, type MessageReactionContext } from './MessageReaction.js';

/**
 * Cached reactions on a {@link Message}, keyed by emoji identifier.
 */
export class MessageReactionManager {
  private readonly _cache = new Collection<string, MessageReaction>();

  constructor(private readonly message: MessageReactionContext) {}

  /** Reactions keyed by unicode name or `name:id`. */
  get cache(): Collection<string, MessageReaction> {
    return this._cache;
  }

  get size(): number {
    return this._cache.size;
  }

  [Symbol.iterator](): IterableIterator<MessageReaction> {
    return this._cache.values();
  }

  /** @internal Sync from an API message payload. */
  _patch(reactions: APIMessageReaction[] | null | undefined): void {
    this._cache.clear();
    for (const data of reactions ?? []) {
      const reaction = MessageReaction.fromMessage(this.message, data);
      this._cache.set(reaction.emojiIdentifier, reaction);
    }
  }
}
