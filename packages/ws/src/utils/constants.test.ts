import { describe, it, expect } from 'vitest';
import { GatewayCloseCodes } from './constants.js';

describe('GatewayCloseCodes', () => {
  it('has standard WebSocket close codes', () => {
    expect(GatewayCloseCodes.Normal).toBe(1000);
    expect(GatewayCloseCodes.GoingAway).toBe(1001);
    expect(GatewayCloseCodes.ProtocolError).toBe(1002);
    expect(GatewayCloseCodes.UnsupportedData).toBe(1003);
  });

  it('has Fluxer-specific codes', () => {
    expect(GatewayCloseCodes.NotAuthenticated).toBe(4003);
    expect(GatewayCloseCodes.AuthenticationFailed).toBe(4004);
    expect(GatewayCloseCodes.RateLimited).toBe(4008);
    expect(GatewayCloseCodes.InvalidShard).toBe(4010);
    expect(GatewayCloseCodes.AckBackpressure).toBe(4013);
  });

  it('has all expected keys', () => {
    const expected = [
      'Normal',
      'GoingAway',
      'ProtocolError',
      'UnsupportedData',
      'NoStatusReceived',
      'AbnormalClosure',
      'UnknownError',
      'UnknownOpcode',
      'DecodeError',
      'NotAuthenticated',
      'AuthenticationFailed',
      'AlreadyAuthenticated',
      'InvalidSeq',
      'RateLimited',
      'SessionTimeout',
      'InvalidShard',
      'ShardingRequired',
      'InvalidAPIVersion',
      'AckBackpressure',
    ];
    for (const key of expected) {
      expect(GatewayCloseCodes).toHaveProperty(key);
    }
  });
});
