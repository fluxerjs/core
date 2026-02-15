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
});
