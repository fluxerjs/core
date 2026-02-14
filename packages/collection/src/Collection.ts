/**
 * Extended Map with utility methods for key-value collections.
 * Similar to discord.js Collection.
 */
export class Collection<K, V> extends Map<K, V> {
  /**
   * Obtains the first value(s) in this collection.
   * @param amount - Amount of values to obtain (optional)
   */
  first(): V | undefined;
  first(amount: number): V[];
  first(amount?: number): V | V[] | undefined {
    if (amount === undefined) return this.values().next().value;
    const arr = this.toJSON();
    if (amount <= 0) return [];
    return arr.slice(0, amount);
  }

  /**
   * Obtains the last value(s) in this collection.
   * @param amount - Amount of values to obtain (optional)
   */
  last(): V | undefined;
  last(amount: number): V[];
  last(amount?: number): V | V[] | undefined {
    const arr = this.toJSON();
    if (amount === undefined) return arr[arr.length - 1];
    if (amount <= 0) return [];
    return arr.slice(-amount);
  }

  /**
   * Returns a random value from this collection.
   * @param amount - Amount of values to randomly obtain (optional)
   */
  random(): V | undefined;
  random(amount: number): V[];
  random(amount?: number): V | V[] | undefined {
    const arr = this.toJSON();
    if (arr.length === 0) return amount === undefined ? undefined : [];
    if (amount === undefined) return arr[Math.floor(Math.random() * arr.length)]!;
    const copy = [...arr];
    const result: V[] = [];
    for (let i = 0; i < Math.min(amount, arr.length); i++) {
      const index = Math.floor(Math.random() * copy.length);
      result.push(copy.splice(index, 1)[0]!);
    }
    return result;
  }

  /**
   * Searches for a single item where the given function returns a truthy value.
   */
  find(fn: (value: V, key: K) => boolean): V | undefined {
    for (const [key, value] of this) {
      if (fn(value, key)) return value;
    }
    return undefined;
  }

  /**
   * Returns the key of the first item where the given function returns a truthy value.
   */
  findKey(fn: (value: V, key: K) => boolean): K | undefined {
    for (const [key, value] of this) {
      if (fn(value, key)) return key;
    }
    return undefined;
  }

  /**
   * Creates a new collection with all elements that pass the test implemented by the provided function.
   */
  filter(fn: (value: V, key: K) => boolean): Collection<K, V> {
    const result = new Collection<K, V>();
    for (const [key, value] of this) {
      if (fn(value, key)) result.set(key, value);
    }
    return result;
  }

  /**
   * Creates a new array with the results of calling the provided function on every element.
   */
  map<T>(fn: (value: V, key: K) => T): T[] {
    const result: T[] = [];
    for (const [key, value] of this) {
      result.push(fn(value, key));
    }
    return result;
  }

  /**
   * Tests whether at least one element passes the test implemented by the provided function.
   */
  some(fn: (value: V, key: K) => boolean): boolean {
    for (const [key, value] of this) {
      if (fn(value, key)) return true;
    }
    return false;
  }

  /**
   * Tests whether all elements pass the test implemented by the provided function.
   */
  every(fn: (value: V, key: K) => boolean): boolean {
    for (const [key, value] of this) {
      if (!fn(value, key)) return false;
    }
    return true;
  }

  /**
   * Applies a function against an accumulator and each element to reduce the collection to a single value.
   */
  reduce<T>(fn: (accumulator: T, value: V, key: K) => T, initialValue: T): T {
    let acc = initialValue;
    for (const [key, value] of this) {
      acc = fn(acc, value, key);
    }
    return acc;
  }

  /**
   * Partitions the collection into two collections: one that passes the predicate and one that fails.
   */
  partition(fn: (value: V, key: K) => boolean): [Collection<K, V>, Collection<K, V>] {
    const pass = new Collection<K, V>();
    const fail = new Collection<K, V>();
    for (const [key, value] of this) {
      if (fn(value, key)) pass.set(key, value);
      else fail.set(key, value);
    }
    return [pass, fail];
  }

  /**
   * Invokes the given function and returns this collection (for chaining).
   */
  tap(fn: (collection: this) => void): this {
    fn(this);
    return this;
  }

  /**
   * Creates an identical shallow copy of this collection.
   */
  clone(): Collection<K, V> {
    return new Collection(this);
  }

  /**
   * Combines this collection with others into a new collection.
   */
  concat(...collections: ReadonlyCollection<K, V>[]): Collection<K, V> {
    const result = this.clone();
    for (const coll of collections) {
      for (const [key, value] of coll) result.set(key, value);
    }
    return result;
  }

  /**
   * Sorts the collection in place and returns it.
   */
  sort(compareFn?: (a: V, b: V, aKey: K, bKey: K) => number): this {
    const entries = [...this.entries()].sort((a, b) => {
      if (compareFn) return compareFn(a[1], b[1], a[0], b[0]);
      return 0;
    });
    this.clear();
    for (const [key, value] of entries) {
      this.set(key, value);
    }
    return this;
  }

  /**
   * Returns an array of the values in this collection.
   */
  toJSON(): V[] {
    return [...this.values()];
  }

  /**
   * Returns a string representation of the collection (array of values).
   */
  override toString(): string {
    return `Collection(${this.size})`;
  }
}

/**
 * Read-only view of a Collection (e.g. for method return types).
 */
export type ReadonlyCollection<K, V> = Omit<Collection<K, V>, 'set' | 'delete' | 'clear'>;
