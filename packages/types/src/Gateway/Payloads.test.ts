import { describe, expect, it } from 'vitest';
import type {
  GatewayIdentifyData,
  GatewayReadyDispatchData,
  GatewayVoiceServerUpdateDispatchData,
  GatewayVoiceStateUpdateData,
} from './Payloads.js';

describe('GatewayIdentifyData', () => {
  it('allows e2ee_capable and omits Discord leftover identify fields', () => {
    const identify: GatewayIdentifyData = {
      token: 'bot-token',
      properties: {
        os: 'darwin',
        browser: 'fluxerjs',
        device: 'fluxerjs',
        e2ee_capable: true,
      },
    };
    expect(identify.properties.e2ee_capable).toBe(true);
    expect(identify).not.toHaveProperty('compress');
    expect(identify).not.toHaveProperty('large_threshold');
    expect(identify).not.toHaveProperty('intents');
  });
});

describe('GatewayVoiceStateUpdateData', () => {
  it('includes mutation_id for guild placement ACK', () => {
    const payload: GatewayVoiceStateUpdateData = {
      guild_id: 'g1',
      channel_id: 'c1',
      mutation_id: 'mut-1',
    };
    expect(payload.mutation_id).toBe('mut-1');
  });
});

describe('GatewayVoiceServerUpdateDispatchData', () => {
  it('allows omitted guild_id (calls) and e2ee_key', () => {
    const callGrant: GatewayVoiceServerUpdateDispatchData = {
      token: 'grant',
      endpoint: 'voice.example.test',
      channel_id: 'dm1',
      e2ee_key: 'key-material',
    };
    expect(callGrant.guild_id).toBeUndefined();
    expect(callGrant.e2ee_key).toBe('key-material');
  });
});

describe('GatewayReadyDispatchData', () => {
  it('accepts unavailable guild stubs without properties', () => {
    const ready: GatewayReadyDispatchData = {
      user: { id: '1', username: 'bot', discriminator: '0' } as GatewayReadyDispatchData['user'],
      session_id: 's1',
      guilds: [{ id: 'g1', unavailable: true }],
    };
    expect(ready.guilds[0]).toEqual({ id: 'g1', unavailable: true });
  });
});
