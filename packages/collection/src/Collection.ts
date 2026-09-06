/**
 * Extended Map with utility methods for key-value collections.
 */
export class Collection<K, V> extends Map<K, V> {
  /**
   * @deprecated Managers **are** the collection. Prefer `guild.channels.get(id)` over
   * `guild.channels.cache.get(id)`. This alias returns `this` for one minor (discord.js migration).
   */
  get cache(): this {
    return this;
  }

  /** First value, or the first `amount` values. */
  first(): V | undefined;
  first(amount: number): V[];
  first(amount?: number): V | V[] | undefined {
    if (amount === undefined) return this.values().next().value;
    if (amount <= 0) return [];
    if (amount >= this.size) return [...this.values()];
    const out: V[] = [];
    for (const value of this.values()) {
      out.push(value);
      if (out.length === amount) break;
    }
    return out;
  }

  /** Last value, or the last `amount` values (no full-array alloc for a single item). */
  last(): V | undefined;
  last(amount: number): V[];
  last(amount?: number): V | V[] | undefined {
    if (amount === undefined) {
      let last: V | undefined;
      for (const value of this.values()) last = value;
      return last;
    }
    if (amount <= 0) return [];
    if (amount >= this.size) return [...this.values()];

    // Ring buffer — O(amount) memory, one pass.
    const buf: V[] = new Array(amount);
    let n = 0;
    for (const value of this.values()) buf[n++ % amount] = value;
    const start = n % amount;
    return buf.slice(start).concat(buf.slice(0, start));
  }

  /** One random value, or `amount` unique random values. */
  random(): V | undefined;
  random(amount: number): V[];
  random(amount?: number): V | V[] | undefined {
    if (amount === undefined) {
      const { size } = this;
      if (size === 0) return undefined;
      let i = Math.floor(Math.random() * size);
      for (const value of this.values()) {
        if (i-- === 0) return value;
      }
      return undefined;
    }
    if (amount <= 0 || this.size === 0) return [];

    const arr = [...this.values()];
    const n = Math.min(amount, arr.length);
    for (let i = 0; i < n; i++) {
      const j = i + Math.floor(Math.random() * (arr.length - i));
      const tmp = arr[i]!;
      arr[i] = arr[j]!;
      arr[j] = tmp;
    }
    arr.length = n;
    return arr;
  }

  find(fn: (value: V, key: K) => boolean): V | undefined {
    for (const [key, value] of this) {
      if (fn(value, key)) return value;
    }
    return undefined;
  }

  findKey(fn: (value: V, key: K) => boolean): K | undefined {
    for (const [key, value] of this) {
      if (fn(value, key)) return key;
    }
    return undefined;
  }

  filter(fn: (value: V, key: K) => boolean): Collection<K, V> {
    const out = new Collection<K, V>();
    for (const [key, value] of this) {
      if (fn(value, key)) out.set(key, value);
    }
    return out;
  }

  map<T>(fn: (value: V, key: K) => T): T[] {
    const out: T[] = [];
    for (const [key, value] of this) out.push(fn(value, key));
    return out;
  }

  some(fn: (value: V, key: K) => boolean): boolean {
    for (const [key, value] of this) {
      if (fn(value, key)) return true;
    }
    return false;
  }

  every(fn: (value: V, key: K) => boolean): boolean {
    for (const [key, value] of this) {
      if (!fn(value, key)) return false;
    }
    return true;
  }

  reduce<T>(fn: (acc: T, value: V, key: K) => T, initialValue: T): T {
    let acc = initialValue;
    for (const [key, value] of this) acc = fn(acc, value, key);
    return acc;
  }

  partition(fn: (value: V, key: K) => boolean): [Collection<K, V>, Collection<K, V>] {
    const pass = new Collection<K, V>();
    const fail = new Collection<K, V>();
    for (const [key, value] of this) {
      (fn(value, key) ? pass : fail).set(key, value);
    }
    return [pass, fail];
  }

  /** Iterate without allocating; returns `this` for chaining. */
  each(fn: (value: V, key: K, collection: this) => void): this {
    for (const [key, value] of this) fn(value, key, this);
    return this;
  }

  tap(fn: (collection: this) => void): this {
    fn(this);
    return this;
  }

  clone(): Collection<K, V> {
    return new Collection(this);
  }

  concat(...collections: ReadonlyCollection<K, V>[]): Collection<K, V> {
    const out = this.clone();
    for (const coll of collections) {
      for (const [key, value] of coll) out.set(key, value);
    }
    return out;
  }

  sort(compareFn?: (a: V, b: V, aKey: K, bKey: K) => number): this {
    const entries = [...this.entries()];
    if (compareFn) entries.sort((a, b) => compareFn(a[1], b[1], a[0], b[0]));
    this.clear();
    for (const [key, value] of entries) this.set(key, value);
    return this;
  }

  toJSON(): V[] {
    return [...this.values()];
  }

  override toString(): string {
    return `Collection(${this.size})`;
  }
}

/** Read-only view of a Collection (e.g. for method return types). */
export type ReadonlyCollection<K, V> = Omit<Collection<K, V>, 'set' | 'delete' | 'clear'>;
