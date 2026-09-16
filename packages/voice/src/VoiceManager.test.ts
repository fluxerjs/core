import { Client, ClientUser, Events, VoiceChannel } from '@fluxerjs/core';
import { ChannelType, GatewayOpcodes } from '@fluxerjs/types';
import { describe, expect, it, vi } from 'vitest';
import { LiveKitRtcConnection } from './LiveKitRtcConnection.js';
import { VoiceManager } from './VoiceManager.js';

function createClient(userId?: string): Client {
  const client = new Client();
  if (userId) {
    client.user = new ClientUser(client, {
      id: userId,
      username: 'test-bot',
      discriminator: '0000',
      global_name: null,
      avatar: null,
      avatar_color: null,
      flags: 0,
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
  it('join throws when the voice channel has no guildId', async () => {
    const client = createClient('bot1');
    const vm = new VoiceManager(client);
    const channel = new VoiceChannel(client, {
      id: 'c1',
      name: 'Test voice',
      type: ChannelType.GuildVoice,
      parent_id: null,
    });
    await expect(vm.join(channel)).rejects.toThrow('missing guildId');
  });

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
      .mockImplementation(() => new Promise<void>((resolve) => connectResolvers.push(resolve)));
    const destroy = vi
      .spyOn(LiveKitRtcConnection.prototype, 'destroy')
      .mockImplementation(() => {});
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

  it('join sends mutation_id and rejects on VOICE_STATE_ACK', async () => {
    const client = createClient('bot1');
    const sendToGateway = vi.spyOn(client, 'sendToGateway').mockImplementation(() => {});
    const channel = createVoiceChannel(client);

    try {
      const vm = new VoiceManager(client);
      const joining = vm.join(channel);
      expect(sendToGateway).toHaveBeenCalledWith(
        0,
        expect.objectContaining({
          op: GatewayOpcodes.VoiceStateUpdate,
          d: expect.objectContaining({
            guild_id: 'g1',
            channel_id: 'c1',
            mutation_id: expect.any(String),
          }),
        }),
      );
      const sent = sendToGateway.mock.calls[0]?.[1] as {
        d: { mutation_id: string };
      };
      client.emit(Events.VoiceStateAck, {
        mutation_id: sent.d.mutation_id,
        status: 'rejected',
        error_code: 'VOICE_PERMISSION_DENIED',
        error_message: 'Missing CONNECT',
      });
      await expect(joining).rejects.toThrow('Missing CONNECT');
    } finally {
      sendToGateway.mockRestore();
    }
  });

  it('leave sends null channel_id with connection_id', () => {
    const client = createClient('bot1');
    const sendToGateway = vi.spyOn(client, 'sendToGateway').mockImplementation(() => {});
    const vm = new VoiceManager(client);
    const channel = createVoiceChannel(client);
    const conn = { channel, destroy: vi.fn() };
    (
      vm as unknown as {
        connections: Map<string, { channel: VoiceChannel; destroy: () => void }>;
        connectionIds: Map<string, string>;
      }
    ).connections.set('c1', conn);
    (vm as unknown as { connectionIds: Map<string, string> }).connectionIds.set('c1', 'conn-1');

    vm.leave('g1');

    expect(conn.destroy).toHaveBeenCalledOnce();
    expect(sendToGateway).toHaveBeenCalledWith(0, {
      op: GatewayOpcodes.VoiceStateUpdate,
      d: {
        guild_id: 'g1',
        channel_id: null,
        connection_id: 'conn-1',
        self_mute: false,
        self_deaf: false,
      },
    });
    sendToGateway.mockRestore();
  });

  it('leaveChannel does not send VoiceStateUpdate without connection_id', () => {
    const client = createClient('bot1');
    const sendToGateway = vi.spyOn(client, 'sendToGateway').mockImplementation(() => {});
    const vm = new VoiceManager(client);
    const channel = createVoiceChannel(client);
    const conn = { channel, destroy: vi.fn() };
    (
      vm as unknown as {
        connections: Map<string, { channel: VoiceChannel; destroy: () => void }>;
      }
    ).connections.set('c1', conn);

    vm.leaveChannel('c1');

    expect(conn.destroy).toHaveBeenCalledOnce();
    expect(sendToGateway).not.toHaveBeenCalled();
    sendToGateway.mockRestore();
  });
});
