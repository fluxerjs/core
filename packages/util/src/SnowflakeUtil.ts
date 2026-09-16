import type { Snowflake } from '@fluxerjs/types';

/** Fluxer epoch (2015-01-01 00:00:00 UTC) in milliseconds. */
export const FLUXER_EPOCH = 1_420_070_400_000n;

const SNOWFLAKE_RE = /^(0|[1-9]\d{0,19})$/;

export interface DeconstructedSnowflake {
  /** Unix timestamp in milliseconds. */
  timestamp: number;
  date: Date;
  /** Worker ID (10 bits, 0–1023). */
  workerId: number;
  /** Per-worker sequence (12 bits, 0–4095). */
  sequence: number;
  /**
   * @deprecated Fluxer snowflakes have no process ID. Always `0`.
   * Present for discord.js migrants that read `processId`.
   */
  processId: number;
}

function invalidSnowflake(value: string): never {
  throw new TypeError(
    `Invalid snowflake "${value}": expected a non-negative decimal string (≤20 digits, no leading zeros)`,
  );
}

/**
 * Fluxer snowflake IDs (Twitter layout, custom epoch).
 * Public API is string-only — never number — to avoid precision loss above 2^53.
 */
export class SnowflakeUtil {
  static readonly EPOCH = FLUXER_EPOCH;

  /** Whether `value` is a non-negative decimal snowflake string (≤ 20 digits). */
  static isValid(snowflake: string): boolean {
    return typeof snowflake === 'string' && SNOWFLAKE_RE.test(snowflake);
  }

  /** Parse a snowflake string to bigint. */
  static parse(snowflake: Snowflake): bigint {
    if (!SnowflakeUtil.isValid(snowflake)) invalidSnowflake(snowflake);
    return BigInt(snowflake);
  }

  /** Unix timestamp (ms) from a snowflake. */
  static timestampFromSnowflake(snowflake: Snowflake): number {
    return Number((SnowflakeUtil.parse(snowflake) >> 22n) + FLUXER_EPOCH);
  }

  /** Date from a snowflake. */
  static dateFromSnowflake(snowflake: Snowflake): Date {
    return new Date(SnowflakeUtil.timestampFromSnowflake(snowflake));
  }

  /**
   * Snowflake string from a Unix timestamp (ms).
   * Useful for pagination (`before` / `after`).
   */
  static snowflakeFromTimestamp(timestamp: number): Snowflake {
    if (!Number.isFinite(timestamp)) {
      throw new TypeError(`Invalid timestamp ${String(timestamp)}: must be a finite number`);
    }
    return ((BigInt(Math.trunc(timestamp)) - FLUXER_EPOCH) << 22n).toString();
  }

  /** Deconstruct a snowflake into timestamp / worker / sequence. */
  static deconstruct(snowflake: Snowflake): DeconstructedSnowflake {
    const big = SnowflakeUtil.parse(snowflake);
    const timestamp = Number((big >> 22n) + FLUXER_EPOCH);
    const workerId = Number((big >> 12n) & 0x3ffn);
    const sequence = Number(big & 0xfffn);
    return {
      timestamp,
      date: new Date(timestamp),
      workerId,
      sequence,
      processId: 0,
    };
  }
}
