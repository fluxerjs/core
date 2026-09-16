import { describe, expect, it } from 'vitest';
import { SnowflakeUtil } from './SnowflakeUtil.js';

describe('SnowflakeUtil', () => {
  it('timestampFromSnowflake round-trips', () => {
    const ts = 1_609_459_200_000;
    const snowflake = SnowflakeUtil.snowflakeFromTimestamp(ts);
    expect(SnowflakeUtil.timestampFromSnowflake(snowflake)).toBe(ts);
  });

  it('isValid accepts valid snowflakes', () => {
    expect(SnowflakeUtil.isValid('1234567890123456789')).toBe(true);
    expect(SnowflakeUtil.isValid('0')).toBe(true);
  });

  it('isValid rejects invalid snowflakes', () => {
    expect(SnowflakeUtil.isValid('')).toBe(false);
    expect(SnowflakeUtil.isValid('abc')).toBe(false);
    expect(SnowflakeUtil.isValid('-1')).toBe(false);
    expect(SnowflakeUtil.isValid('0123')).toBe(false);
  });

  it('parse returns bigint', () => {
    expect(SnowflakeUtil.parse('123')).toBe(123n);
  });

  it('deconstruct returns components', () => {
    const result = SnowflakeUtil.deconstruct('1234567890123456789');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('date');
    expect(result).toHaveProperty('workerId');
    expect(result).toHaveProperty('sequence');
    expect(result).toHaveProperty('processId');
  });

  it('snowflakeFromTimestamp round-trips within second', () => {
    const ts = Date.now();
    const snowflake = SnowflakeUtil.snowflakeFromTimestamp(ts);
    const back = SnowflakeUtil.timestampFromSnowflake(snowflake);
    expect(Math.floor(back / 1000)).toBe(Math.floor(ts / 1000));
  });

  it('dateFromSnowflake returns Date', () => {
    const ts = 1_609_459_200_000;
    const snowflake = SnowflakeUtil.snowflakeFromTimestamp(ts);
    const date = SnowflakeUtil.dateFromSnowflake(snowflake);
    expect(date).toBeInstanceOf(Date);
    expect(date.getTime()).toBe(ts);
  });

  it('deconstruct returns correct component values', () => {
    const sf = SnowflakeUtil.snowflakeFromTimestamp(1_609_459_200_000);
    const d = SnowflakeUtil.deconstruct(sf);
    expect(d.timestamp).toBe(1_609_459_200_000);
    expect(d.date).toBeInstanceOf(Date);
    expect(typeof d.workerId).toBe('number');
    expect(typeof d.sequence).toBe('number');
    expect(d.processId).toBe(0);
  });

  it('deconstruct uses 10-bit worker and 12-bit sequence', () => {
    const ts = 1_609_459_200_000;
    const workerId = 1023;
    const sequence = 4095;
    const snowflake = (
      ((BigInt(ts) - SnowflakeUtil.EPOCH) << 22n) |
      (BigInt(workerId) << 12n) |
      BigInt(sequence)
    ).toString();
    const d = SnowflakeUtil.deconstruct(snowflake);
    expect(d.timestamp).toBe(ts);
    expect(d.workerId).toBe(1023);
    expect(d.sequence).toBe(4095);
    expect(d.processId).toBe(0);
  });

  it('deconstruct extracts worker values above Discord 5-bit range', () => {
    const ts = 1_609_459_200_000;
    const workerId = 512;
    const sequence = 1;
    const snowflake = (
      ((BigInt(ts) - SnowflakeUtil.EPOCH) << 22n) |
      (BigInt(workerId) << 12n) |
      BigInt(sequence)
    ).toString();
    const d = SnowflakeUtil.deconstruct(snowflake);
    expect(d.workerId).toBe(512);
    expect(d.sequence).toBe(1);
  });

  it('deconstruct throws for non-numeric string', () => {
    expect(() => SnowflakeUtil.deconstruct('abc')).toThrow(TypeError);
    expect(() => SnowflakeUtil.deconstruct('12.34')).toThrow(TypeError);
  });

  it('isValid rejects negative and too long', () => {
    expect(SnowflakeUtil.isValid('-123')).toBe(false);
    expect(SnowflakeUtil.isValid(`1${'0'.repeat(20)}`)).toBe(false);
  });
});
