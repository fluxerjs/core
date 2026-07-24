import { describe, it, expect } from 'vitest';
import { Client } from '@fluxerjs/core';
import { VoiceManager, VoiceConnection, LiveKitRtcConnection, getVoiceManager } from './index.js';

describe('@fluxerjs/voice exports', () => {
  it('exports VoiceManager class', () => {
    expect(VoiceManager).toBeDefined();
    expect(typeof VoiceManager).toBe('function');
  });

  it('exports VoiceConnection class', () => {
    expect(VoiceConnection).toBeDefined();
    expect(typeof VoiceConnection).toBe('function');
  });

  it('exports LiveKitRtcConnection class', () => {
    expect(LiveKitRtcConnection).toBeDefined();
    expect(typeof LiveKitRtcConnection).toBe('function');
  });

  it('exports getVoiceManager function', () => {
    expect(getVoiceManager).toBeDefined();
    expect(typeof getVoiceManager).toBe('function');
  });

  it('getVoiceManager returns VoiceManager for a client', () => {
    const client = new Client();
    const manager = getVoiceManager(client);
    expect(manager).toBeInstanceOf(VoiceManager);
    expect(typeof manager.join).toBe('function');
  });

  it('getVoiceManager returns same instance for same client', () => {
    const client = new Client();
    const m1 = getVoiceManager(client);
    const m2 = getVoiceManager(client);
    expect(m1).toBe(m2);
  });
});
