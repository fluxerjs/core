/**
 * Shared Opus parsing utilities for voice connections.
 */

/**
 * Parse Opus packet (RFC 6716) and return single-frame packets for decodeFrame().
 * TOC byte: config (0-4), s (5), c (6-7). c=0: 1 frame; c=1: 2 frames + 1 length byte; c=2: 2 frames CBR + padding; c=3: N frames + (N-1) length bytes.
 * Returns { frames: Uint8Array[], consumed } or null if not enough data.
 */
export function parseOpusPacketBoundaries(
  buffer: Uint8Array
): { frames: Uint8Array[]; consumed: number } | null {
  if (buffer.length < 2) return null;
  const toc = buffer[0];
  const c = toc & 3; // frame count code
  const tocSingle = (toc & 0xfc) | 0; // same config/s, one frame

  if (c === 0) {
    return { frames: [buffer.slice()], consumed: buffer.length };
  }

  if (c === 1) {
    if (buffer.length < 2) return null;
    const L1 = buffer[1] + 1;
    if (buffer.length < 2 + L1) return null;
    const L2 = buffer.length - 2 - L1;
    const frame0 = new Uint8Array(1 + L1);
    frame0[0] = tocSingle;
    frame0.set(buffer.subarray(2, 2 + L1), 1);
    const frame1 = new Uint8Array(1 + L2);
    frame1[0] = tocSingle;
    frame1.set(buffer.subarray(2 + L1), 1);
    return { frames: [frame0, frame1], consumed: buffer.length };
  }

  if (c === 2) {
    if (buffer.length < 3) return null;
    const frameLen = Math.floor((buffer.length - 2) / 2);
    if (frameLen < 1) return null;
    const frame0 = new Uint8Array(1 + frameLen);
    frame0[0] = tocSingle;
    frame0.set(buffer.subarray(2, 2 + frameLen), 1);
    const frame1 = new Uint8Array(1 + frameLen);
    frame1[0] = tocSingle;
    frame1.set(buffer.subarray(2 + frameLen, 2 + 2 * frameLen), 1);
    return { frames: [frame0, frame1], consumed: 2 + 2 * frameLen };
  }

  if (c === 3) {
    if (buffer.length < 2) return null;
    const N = buffer[1];
    if (N < 1 || N > 255) return null;
    const numLengthBytes = N - 1;
    if (buffer.length < 2 + numLengthBytes) return null;
    const lengths: number[] = [];
    for (let i = 0; i < numLengthBytes; i++) {
      lengths.push(buffer[2 + i] + 1);
    }
    const headerLen = 2 + numLengthBytes;
    let offset = headerLen;
    const sumKnown = lengths.reduce((a, b) => a + b, 0);
    const lastLen = buffer.length - headerLen - sumKnown;
    if (lastLen < 0) return null;
    lengths.push(lastLen);
    const frames: Uint8Array[] = [];
    for (let i = 0; i < lengths.length; i++) {
      const L = lengths[i];
      if (offset + L > buffer.length) return null;
      const frame = new Uint8Array(1 + L);
      frame[0] = tocSingle;
      frame.set(buffer.subarray(offset, offset + L), 1);
      frames.push(frame);
      offset += L;
    }
    return { frames, consumed: offset };
  }

  return null;
}

export function concatUint8Arrays(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}
