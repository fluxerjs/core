import { describe, it, expect } from 'vitest';
import { Collection } from './Collection.js';

describe('Collection', () => {
  it('creates empty collection', () => {
    const coll = new Collection<string, number>();
    expect(coll.size).toBe(0);
  });

  it('first returns undefined for empty', () => {
    const coll = new Collection<string, number>();
    expect(coll.first()).toBeUndefined();
  });

  it('first returns first value', () => {
    const coll = new Collection<string, number>([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
    expect(coll.first()).toBe(1);
  });

  it('first(amount) returns first n values', () => {
    const coll = new Collection<string, number>([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
    expect(coll.first(2)).toEqual([1, 2]);
  });

  it('last returns last value', () => {
    const coll = new Collection<string, number>([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
    expect(coll.last()).toBe(3);
  });

  it('random returns undefined for empty', () => {
    const coll = new Collection<string, number>();
    expect(coll.random()).toBeUndefined();
  });

  it('find returns matching value', () => {
    const coll = new Collection<string, number>([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
    expect(coll.find((v) => v === 2)).toBe(2);
  });

  it('filter returns matching subset', () => {
    const coll = new Collection<string, number>([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
    const filtered = coll.filter((v) => v > 1);
    expect(filtered.size).toBe(2);
    expect(filtered.get('b')).toBe(2);
    expect(filtered.get('c')).toBe(3);
  });

  it('map transforms values', () => {
    const coll = new Collection<string, number>([
      ['a', 1],
      ['b', 2],
    ]);
    expect(coll.map((v) => v * 2)).toEqual([2, 4]);
  });

  it('reduce accumulates', () => {
    const coll = new Collection<string, number>([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
    expect(coll.reduce((acc, v) => acc + v, 0)).toBe(6);
  });

  it('findKey returns matching key', () => {
    const coll = new Collection<string, number>([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
    expect(coll.findKey((v) => v === 2)).toBe('b');
    expect(coll.findKey((v) => v === 99)).toBeUndefined();
  });

  it('some returns true when any element matches', () => {
    const coll = new Collection<string, number>([['a', 1], ['b', 2]]);
    expect(coll.some((v) => v === 2)).toBe(true);
    expect(coll.some((v) => v === 99)).toBe(false);
  });

  it('every returns true when all match', () => {
    const coll = new Collection<string, number>([['a', 1], ['b', 2]]);
    expect(coll.every((v) => v > 0)).toBe(true);
    expect(coll.every((v) => v > 1)).toBe(false);
  });

  it('partition splits into pass/fail collections', () => {
    const coll = new Collection<string, number>([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
    const [pass, fail] = coll.partition((v) => v >= 2);
    expect(pass.size).toBe(2);
    expect(fail.size).toBe(1);
    expect(pass.get('b')).toBe(2);
    expect(pass.get('c')).toBe(3);
    expect(fail.get('a')).toBe(1);
  });

  it('clone creates shallow copy', () => {
    const coll = new Collection<string, number>([['a', 1], ['b', 2]]);
    const clone = coll.clone();
    expect(clone.size).toBe(coll.size);
    expect(clone.get('a')).toBe(1);
    clone.set('a', 99);
    expect(coll.get('a')).toBe(1); // original unchanged
  });

  it('concat merges collections', () => {
    const a = new Collection<string, number>([['x', 1]]);
    const b = new Collection<string, number>([['y', 2], ['z', 3]]);
    const c = a.concat(b);
    expect(c.size).toBe(3);
    expect(c.get('x')).toBe(1);
    expect(c.get('y')).toBe(2);
    expect(c.get('z')).toBe(3);
  });

  it('last(amount) returns last n values', () => {
    const coll = new Collection<string, number>([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
    expect(coll.last(2)).toEqual([2, 3]);
  });

  it('tap invokes fn and returns this', () => {
    const coll = new Collection<string, number>([['a', 1]]);
    let tapped = false;
    const result = coll.tap(() => {
      tapped = true;
    });
    expect(tapped).toBe(true);
    expect(result).toBe(coll);
  });

  it('toString returns Collection(n)', () => {
    const coll = new Collection<string, number>([['a', 1], ['b', 2]]);
    expect(coll.toString()).toBe('Collection(2)');
  });
});
