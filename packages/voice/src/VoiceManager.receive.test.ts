import { describe, it, expect, vi } from 'vitest';
import { VoiceManager } from './VoiceManager.js';
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

describe('VoiceManager receive helpers', () => {
  it('lists participants in a channel from voice state map', () => {
    const manager = new VoiceManager(makeClient() as never);

    manager.voiceStates.set('g1', new Map([['u1', 'c1'], ['u2', 'c1'], ['u3', 'c2']]));

    expect(manager.listParticipantsInChannel('g1', 'c1')).toEqual(['u1', 'u2']);
    expect(manager.listParticipantsInChannel('g1', 'missing')).toEqual([]);
  });

  it('subscribes known channel participants for livekit connections', () => {
    const client = makeClient();
    const manager = new VoiceManager(client as never);

    const channel = { id: 'c1', guildId: 'g1' } as never;
    const conn = new LiveKitRtcConnection(client as never, channel, 'bot');
    const subscribeSpy = vi
      .spyOn(conn, 'subscribeParticipantAudio')
      .mockImplementation((participantId) => ({ participantId, stop: vi.fn() }));

    manager.voiceStates.set('g1', new Map([['bot', 'c1'], ['u1', 'c1'], ['u2', 'c1'], ['u3', 'c9']]));
    (manager as unknown as { connections: Map<string, LiveKitRtcConnection> }).connections.set(
      'c1',
      conn,
    );

    const subs = manager.subscribeChannelParticipants('c1');

    expect(subscribeSpy).toHaveBeenCalledTimes(2);
    expect(subs.map((s) => s.participantId)).toEqual(['u1', 'u2']);
  });
});
