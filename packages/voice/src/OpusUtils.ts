/**
 * Shared Opus parsing utilities for voice connections.
 */

/**
 * Return the next complete Opus packet from a WebM SimpleBlock payload.
 *
 * Each SimpleBlock emitted by the WebM demuxer holds exactly one complete
 * Opus packet (RFC 6716 section 3, TOC codes 0-3, including multi-frame
 * code 3 packets). libopus's opus_decode (which backs OpusDecoder) accepts
 * a full packet in a single call and handles every TOC code itself, so no
 * manual frame splitting is needed here.
 *
 * The previous hand-rolled framing misparsed code 3 packets (the CBR count
 * byte was read as VBR length bytes, and a count byte of 0 returned null on
 * every call), which permanently stalled decoding and made the caller's
 * accumulator grow without bound while being re-parsed on every chunk.
 *
 * Returns { frames: [packet], consumed: buffer.length } so callers keep their
 * existing queue/consume flow, or null if the buffer does not yet contain a
 * decodable packet (fewer than 2 bytes).
 */
export function parseOpusPacketBoundaries(
  buffer: Uint8Array,
): { frames: Uint8Array[]; consumed: number } | null {
  if (buffer.length < 2) return null;
  return { frames: [buffer.slice()], consumed: buffer.length };
}

export function concatUint8Arrays(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}
