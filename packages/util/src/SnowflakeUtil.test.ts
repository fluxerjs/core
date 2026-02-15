import { describe, it, expect } from 'vitest';
import { SnowflakeUtil } from './SnowflakeUtil.js';

describe('SnowflakeUtil', () => {
  it('timestampFromSnowflake converts correctly', () => {
    const ts = 1609459200000; // 2021-01-01
    const snowflake = SnowflakeUtil.snowflakeFromTimestamp(ts);
    const back = SnowflakeUtil.timestampFromSnowflake(snowflake);
    expect(back).toBe(ts);
  });

  it('isValid accepts valid snowflakes', () => {
    expect(SnowflakeUtil.isValid('1234567890123456789')).toBe(true);
    expect(SnowflakeUtil.isValid('0')).toBe(true);
  });

  it('isValid rejects invalid snowflakes', () => {
    expect(SnowflakeUtil.isValid('')).toBe(false);
    expect(SnowflakeUtil.isValid('abc')).toBe(false);
    expect(SnowflakeUtil.isValid('-1')).toBe(false);
  });

  it('deconstruct returns components', () => {
    const result = SnowflakeUtil.deconstruct('1234567890123456789');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('date');
    expect(result).toHaveProperty('workerId');
    expect(result).toHaveProperty('processId');
    expect(result).toHaveProperty('increment');
  });

  it('snowflakeFromTimestamp round-trips', () => {
    const ts = Date.now();
    const snowflake = SnowflakeUtil.snowflakeFromTimestamp(ts);
    const back = SnowflakeUtil.timestampFromSnowflake(snowflake);
    expect(Math.floor(back / 1000)).toBe(Math.floor(ts / 1000));
  });
});
