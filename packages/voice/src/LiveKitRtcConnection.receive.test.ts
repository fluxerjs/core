import { describe, it, expect, vi } from 'vitest';
import { LiveKitRtcConnection } from './LiveKitRtcConnection.js';

function makeClient() {
  return {
    on: vi.fn(),
    emit: vi.fn(),
    sendToGateway: vi.fn(),
    user: { id: 'bot' },
    rest: { post: vi.fn() },
  };
}

describe('LiveKitRtcConnection receive api', () => {
  it('returns inert subscription when room is not connected', () => {
    const channel = { id: 'c1', guildId: 'g1' } as never;
    const conn = new LiveKitRtcConnection(makeClient() as never, channel, 'bot');

    const sub = conn.subscribeParticipantAudio('u1');

    expect(sub.participantId).toBe('u1');
    expect(() => sub.stop()).not.toThrow();
  });
});
