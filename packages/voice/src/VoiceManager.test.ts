import { describe, it, expect, vi } from 'vitest';
import { Client, ClientUser, Events, VoiceChannel } from '@fluxerjs/core';
import { ChannelType } from '@fluxerjs/types';
import { VoiceManager } from './VoiceManager.js';
import { LiveKitRtcConnection } from './LiveKitRtcConnection.js';

function createClient(userId?: string): Client {
  const client = new Client();
  if (userId) {
    client.user = new ClientUser(client, {
      id: userId,
      username: 'test-bot',
      discriminator: '0000',
      bot: true,
    });
  }
  return client;
}

function createVoiceChannel(client: Client): VoiceChannel {
  return new VoiceChannel(client, {
    id: 'c1',
    guild_id: 'g1',
    name: 'Test voice',
    type: ChannelType.GuildVoice,
    parent_id: null,
  });
}

describe('VoiceManager', () => {
  it('getVoiceChannelId returns null for unknown guild', () => {
    const client = createClient();
    const vm = new VoiceManager(client);
    expect(vm.getVoiceChannelId('guild1', 'user1')).toBeNull();
  });

  it('getVoiceChannelId returns channel after VoiceStatesSync', () => {
    const client = createClient();
    const vm = new VoiceManager(client);
    client.emit(Events.VoiceStatesSync, {
      guildId: 'guild1',
      voiceStates: [
        { user_id: 'user1', channel_id: 'channel1' },
        { user_id: 'user2', channel_id: null },
      ],
    });
    expect(vm.getVoiceChannelId('guild1', 'user1')).toBe('channel1');
    expect(vm.getVoiceChannelId('guild1', 'user2')).toBeNull();
    expect(vm.getVoiceChannelId('guild1', 'user3')).toBeNull();
  });

  it('getVoiceChannelId returns null for user not in guild map', () => {
    const client = createClient();
    const vm = new VoiceManager(client);
    client.emit(Events.VoiceStatesSync, {
      guildId: 'guild1',
      voiceStates: [{ user_id: 'user1', channel_id: 'channel1' }],
    });
    expect(vm.getVoiceChannelId('guild1', 'user2')).toBeNull();
    expect(vm.getVoiceChannelId('guild2', 'user1')).toBeNull();
  });

  it('does not let an old timeout cancel a replacement join', async () => {
    vi.useFakeTimers();
    const client = createClient('bot1');
    const sendToGateway = vi.spyOn(client, 'sendToGateway').mockImplementation(() => {});
    const connectResolvers: Array<() => void> = [];
    const connect = vi
      .spyOn(LiveKitRtcConnection.prototype, 'connect')
      .mockImplementation(
        () => new Promise<void>((resolve) => connectResolvers.push(resolve)),
      );
    const destroy = vi.spyOn(LiveKitRtcConnection.prototype, 'destroy').mockImplementation(() => {});
    const channel = createVoiceChannel(client);

    try {
      const vm = new VoiceManager(client);
      const first = vm.join(channel);
      client.emit(Events.VoiceServerUpdate, {
        guild_id: 'g1',
        endpoint: 'voice.example.test',
        token: 'token',
      });
      const firstRejected = expect(first).rejects.toThrow('Voice connection timeout');

      await vi.advanceTimersByTimeAsync(10_000);
      const second = vm.join(channel);
      client.emit(Events.VoiceServerUpdate, {
        guild_id: 'g1',
        endpoint: 'voice.example.test',
        token: 'token',
      });
      const secondRejected = expect(second).rejects.toThrow('Voice connection timeout');

      connectResolvers[0]?.();
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(10_000);
      await firstRejected;
      expect(connect).toHaveBeenCalledTimes(2);
      expect(destroy).toHaveBeenCalledOnce();

      await vi.advanceTimersByTimeAsync(10_000);
      await secondRejected;
      expect(destroy).toHaveBeenCalledTimes(2);
    } finally {
      connect.mockRestore();
      destroy.mockRestore();
      sendToGateway.mockRestore();
      vi.useRealTimers();
    }
  });

  it('starts one connection when LiveKit voice events arrive separately', async () => {
    const client = createClient('bot1');
    const sendToGateway = vi.spyOn(client, 'sendToGateway').mockImplementation(() => {});
    const connect = vi.spyOn(LiveKitRtcConnection.prototype, 'connect').mockResolvedValue();
    const channel = createVoiceChannel(client);

    try {
      const vm = new VoiceManager(client);
      const connection = vm.join(channel);
      client.emit(Events.VoiceServerUpdate, {
        guild_id: 'g1',
        endpoint: 'voice.example.test',
        token: 'token',
      });
      client.emit(Events.VoiceStateUpdate, {
        guild_id: 'g1',
        channel_id: 'c1',
        user_id: 'bot1',
        session_id: 'session1',
      });

      await connection;
      expect(connect).toHaveBeenCalledOnce();
    } finally {
      connect.mockRestore();
      sendToGateway.mockRestore();
    }
  });
});
