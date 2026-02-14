/**
 * Snowflake ID type - 64-bit unsigned integer as string.
 * Fluxer uses Twitter Snowflakes with epoch 1420070400000 (first second of 2015).
 */
export type Snowflake = string;

/** Fluxer epoch in milliseconds (2015-01-01 00:00:00 UTC) */
export const FLUXER_EPOCH = 1420070400000;
