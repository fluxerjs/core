import { describe, expect, it } from 'vitest';
import { parseOpusPacketBoundaries } from './OpusUtils.js';

describe('parseOpusPacketBoundaries', () => {
  it('returns null for buffers shorter than a TOC byte plus payload', () => {
    expect(parseOpusPacketBoundaries(new Uint8Array([]))).toBeNull();
    expect(parseOpusPacketBoundaries(new Uint8Array([0]))).toBeNull();
  });

  it('returns the complete packet as a single frame for code 0', () => {
    const buf = new Uint8Array([0x78, 0x01, 0x02, 0x03]); // c=0
    const result = parseOpusPacketBoundaries(buf);
    expect(result).not.toBeNull();
    expect(result!.frames).toHaveLength(1);
    expect(result!.consumed).toBe(4);
    expect(Array.from(result!.frames[0])).toEqual([0x78, 0x01, 0x02, 0x03]);
  });

  it('passes complete multi-frame packets (code 1) through unsplit', () => {
    // c=1: TOC + length byte + two equal-size frames — libopus decodes the
    // whole packet itself, so no manual splitting is wanted here.
    const buf = new Uint8Array([0x79, 0x02, 0xaa, 0xbb, 0xcc, 0xdd, 0xee]);
    const result = parseOpusPacketBoundaries(buf);
    expect(result).not.toBeNull();
    expect(result!.frames).toHaveLength(1);
    expect(result!.consumed).toBe(buf.length);
    expect(result!.frames[0]).not.toBe(buf); // copy, not the caller's buffer
  });

  it('passes complete multi-frame packets (code 2) through unsplit', () => {
    const buf = new Uint8Array([0x7a, 0x00, 0x01, 0x02, 0x03, 0x04]); // c=2
    const result = parseOpusPacketBoundaries(buf);
    expect(result).not.toBeNull();
    expect(result!.frames).toHaveLength(1);
    expect(result!.consumed).toBe(buf.length);
  });

  it('does not stall on code 3 packets with a zero frame count byte', () => {
    // Regression: code 3 CBR with count byte 0 used to return null on every
    // call, permanently stalling decode while the caller's accumulator buffer
    // grew without bound (O(n^2) re-parsing) and audio died.
    const buf = new Uint8Array([0x7b, 0x00, 0x01, 0x02]); // c=3, count byte 0
    const result = parseOpusPacketBoundaries(buf);
    expect(result).not.toBeNull();
    expect(result!.frames).toHaveLength(1);
    expect(result!.consumed).toBe(buf.length);
  });
});
