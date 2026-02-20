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
  | (S | number | BitField<S>)[];

export class BitField<S extends string> {
  static Flags: Record<string, number> = {};
  defaultBit = 0;
  bitfield: number;

  constructor(bits: BitFieldResolvable<S> = 0) {
    const Ctor = this.constructor as typeof BitField;
    this.bitfield = Ctor.resolve(bits);
  }

  get [Symbol.toStringTag](): string {
    return `BitField${this.bitfield}`;
  }

  static resolve<S extends string>(bit: BitFieldResolvable<S>): number {
    const Flags = this.Flags as Record<string, number>;
    if (typeof bit === 'number' && bit >= 0) return bit;
    if (bit instanceof BitField) return bit.bitfield;
    if (Array.isArray(bit)) return bit.map((b) => this.resolve(b)).reduce((a, b) => a | b, 0);
    if (typeof bit === 'string' && typeof Flags[bit] !== 'undefined') return Flags[bit]!;
    throw new RangeError(`Invalid bitfield flag or number: ${bit}`);
  }

  has(bit: BitFieldResolvable<S>): boolean {
    bit = (this.constructor as typeof BitField).resolve(bit);
    return (this.bitfield & bit) === bit;
  }

  add(...bits: BitFieldResolvable<S>[]): this {
    let total = 0;
    for (const bit of bits) {
      total |= (this.constructor as typeof BitField).resolve(bit);
    }
    this.bitfield |= total;
    return this;
  }

  remove(...bits: BitFieldResolvable<S>[]): this {
    let total = 0;
    for (const bit of bits) {
      total |= (this.constructor as typeof BitField).resolve(bit);
    }
    this.bitfield &= ~total;
    return this;
  }

  serialize(): Record<S, boolean> {
    const Flags = (this.constructor as typeof BitField).Flags as Record<S, number>;
    const serialized: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(Flags) as [S, number][]) {
      serialized[key as string] = (this.bitfield & value) === value;
    }
    return serialized as Record<S, boolean>;
  }

  toArray(): S[] {
    const Flags = (this.constructor as typeof BitField).Flags as Record<S, number>;
    return (Object.entries(Flags) as [S, number][])
      .filter(([, value]) => (this.bitfield & value) === value)
      .map(([key]) => key);
  }

  toJSON(): number {
    return this.bitfield;
  }

  valueOf(): number {
    return this.bitfield;
  }

  equals(bitfield: BitField<S>): boolean {
    return this.bitfield === bitfield.bitfield;
  }

  freeze(): Readonly<BitField<S>> {
    return Object.freeze(this);
  }
}
