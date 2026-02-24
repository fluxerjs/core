/**
 * Data structure that allows efficient storage of multiple flags (bits) in a single number.
 *
 * Note: JavaScript bitwise operations (|, &, ^, <<, >>) operate on 32-bit signed integers.
 * Flags with values exceeding 2^30 may exhibit unexpected behavior. For permission-style
 * bitfields with more than 30 bits, consider using BigInt-based implementations.
 */
export type BitFieldResolvable<S extends string> =
  | S
  | bigint
  | number
  | BitField<S>
  | (S | number | bigint | BitField<S>)[];

export class BitField<S extends string> {
  static Flags: Record<string, bigint> = {};
  defaultBit = 0;
  bitfield: bigint;

  constructor(bits: BitFieldResolvable<S> = 0) {
    this.bitfield = (this.constructor as typeof BitField).resolve(bits);
  }

  get [Symbol.toStringTag](): string {
    return `BitField${this.bitfield}`;
  }

  static resolve<S extends string>(bits: BitFieldResolvable<S>): bigint {
    if (typeof bits === 'number' && bits >= 0) return BigInt(bits);
    if (typeof bits === 'bigint' && bits >= 0n) return bits;
    if (bits instanceof BitField) return bits.bitfield;
    if (Array.isArray(bits)) return bits.map((b) => this.resolve(b)).reduce((a, b) => BigInt(a) | BigInt(b), 0n);
    if (typeof bits === 'string') {
      // If the string matches a known flag name, return its bigint value
      if (bits in this.Flags) {
        return this.Flags[bits as S];
      }
      console.log(this.Flags);

      // Otherwise, try to interpret the string as a valid non-negative bigint literal
      try {
        const value = BigInt(bits);
        if (value >= 0n) return value;
      } catch {
        // fall through to error below
      }
    }
    throw new RangeError(`Invalid bitfield flag or number: ${bits}`);
  }

  has(bit: BitFieldResolvable<S>): boolean {
    console.log(bit);
    bit = (this.constructor as typeof BitField).resolve(bit);
    return (this.bitfield & bit) !== 0n;
  }

  add(...bits: BitFieldResolvable<S>[]): this {
    let total = 0n;
    for (const bit of bits) {
      total |= (this.constructor as typeof BitField).resolve(bit);
    }
    this.bitfield |= total;
    return this;
  }

  remove(...bits: BitFieldResolvable<S>[]): this {
    let total = 0n;
    for (const bit of bits) {
      total |= (this.constructor as typeof BitField).resolve(bit);
    }
    this.bitfield &= ~total;
    return this;
  }

  serialize(): Record<S, boolean> {
    const Flags = (this.constructor as typeof BitField).Flags as Record<S, bigint>;
    const serialized: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(Flags) as [S, bigint][]) {
      serialized[key as string] = (this.bitfield & value) === value;
    }
    return serialized as Record<S, boolean>;
  }

  toArray(): S[] {
    const Flags = (this.constructor as typeof BitField).Flags as Record<S, bigint>;
    return (Object.entries(Flags) as [S, bigint][])
      .filter(([, value]) => (this.bitfield & value) === value)
      .map(([key]) => key);
  }

  toJSON() {
    return this.bitfield.toString();
  }

  valueOf() {
    return this.bitfield.toString();
  }

  equals(bitfield: BitField<S>): boolean {
    return this.bitfield === bitfield.bitfield;
  }

  freeze(): Readonly<BitField<S>> {
    return Object.freeze(this);
  }
}
