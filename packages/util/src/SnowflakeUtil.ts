/** Fluxer epoch (2015-01-01 00:00:00 UTC) in milliseconds */
export const FLUXER_EPOCH = 1420070400000n;

/**
 * Utilities for Fluxer snowflake IDs.
 * Fluxer uses Twitter Snowflakes with a custom epoch.
 */
export class SnowflakeUtil {
  static readonly EPOCH = FLUXER_EPOCH;

  /**
   * Converts a snowflake to a Unix timestamp in milliseconds.
   */
  static timestampFromSnowflake(snowflake: string): number {
    return Number((BigInt(snowflake) >> 22n) + FLUXER_EPOCH);
  }

  /**
   * Converts a snowflake to a Date.
   */
  static dateFromSnowflake(snowflake: string): Date {
    return new Date(this.timestampFromSnowflake(snowflake));
  }

  /**
   * Converts a Unix timestamp (ms) to a snowflake string.
   * Useful for pagination (before/after).
   */
  static snowflakeFromTimestamp(timestamp: number): string {
    return ((BigInt(timestamp) - FLUXER_EPOCH) << 22n).toString();
  }

  /**
   * Deconstructs a snowflake into its components.
   */
  static deconstruct(snowflake: string): {
    timestamp: number;
    date: Date;
    workerId: number;
    processId: number;
    increment: number;
  } {
    const big = BigInt(snowflake);
    return {
      timestamp: Number((big >> 22n) + FLUXER_EPOCH),
      date: new Date(Number((big >> 22n) + FLUXER_EPOCH)),
      workerId: Number((big >> 17n) & 0x1fn),
      processId: Number((big >> 12n) & 0x1fn),
      increment: Number(big & 0xfffn),
    };
  }

  /**
   * Checks if a string is a valid snowflake format (numeric string, 0 or positive).
   */
  static isValid(snowflake: string): boolean {
    return /^(0|[1-9]\d*)$/.test(snowflake) && snowflake.length <= 20;
  }
}
