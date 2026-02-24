import { describe, it, expect } from 'vitest';
import { BitField } from './BitField.js';

// Minimal BitField subclass for testing
class TestBitField extends BitField<'A' | 'B' | 'C'> {
  static override Flags = { A: 1n, B: 2n, C: 4n };
}

describe('BitField', () => {
  it('creates with default bit 0', () => {
    const bf = new TestBitField();
    expect(bf.bitfield).toBe(0n);
  });

  it('resolves number', () => {
    const bf = new TestBitField(3);
    expect(bf.bitfield).toBe(3n);
  });

  it('resolves string flag', () => {
    const bf = new TestBitField('A');
    expect(bf.bitfield).toBe(1n);
  });

  it('resolves array of flags with OR', () => {
    const bf = new TestBitField(['A', 'B']);
    expect(bf.bitfield).toBe(3n); // 1 | 2
  });

  it('has checks single bit', () => {
    const bf = new TestBitField(['A', 'B']);
    expect(bf.has('A')).toBe(true);
    expect(bf.has('B')).toBe(true);
    expect(bf.has('C')).toBe(false);
  });

  it('has checks number', () => {
    const bf = new TestBitField(3);
    expect(bf.has(2)).toBe(true);
  });

  it('add sets bits', () => {
    const bf = new TestBitField('A').add('B');
    expect(bf.bitfield).toBe(3n);
  });

  it('remove unsets bits', () => {
    const bf = new TestBitField(['A', 'B', 'C']).remove('B');
    expect(bf.bitfield).toBe(5n); // A | C
  });

  it('serialize returns object', () => {
    const bf = new TestBitField(['A', 'C']);
    const s = bf.serialize();
    expect(s).toEqual({ A: true, B: false, C: true });
  });

  it('toArray returns enabled flags', () => {
    const bf = new TestBitField(['A', 'C']);
    expect(bf.toArray()).toEqual(['A', 'C']);
  });

  it('toJSON returns serialized string', () => {
    const bf = new TestBitField(5);
    expect(bf.toJSON()).toBe('5');
  });

  it('equals compares bitfields', () => {
    const a = new TestBitField(['A', 'B']);
    const b = new TestBitField(3);
    const c = new TestBitField('A');
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });

  it('freeze returns frozen instance', () => {
    const bf = new TestBitField('A').freeze();
    expect(Object.isFrozen(bf)).toBe(true);
  });

  it('throws for invalid flag string', () => {
    expect(() => new TestBitField('Invalid' as 'A')).toThrow(RangeError);
  });
});
