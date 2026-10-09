import type {
  APIChannel,
  GatewayChannelPinsUpdateDispatchData,
  GatewayChannelRecipientAddDispatchData,
  GatewayChannelRecipientRemoveDispatchData,
  GatewayChannelUpdateBulkDispatchData,
} from '@fluxerjs/types';
import { Channel } from '../../Domain/Channel/index.js';
import { Events } from '../../Helpers/Events.js';
import type { ChannelPinsUpdatePayload, ChannelRecipientPayload } from '../EventPayloads.js';
import { indexChannel } from './Helpers.js';
import type { HandlerMap } from './Types.js';

export const channelHandlers: HandlerMap = {
  CHANNEL_CREATE(client, d) {
    const ch = Channel.fromOrCreate(client, d as APIChannel);
    if (!ch) return;
    indexChannel(client, ch);
    client.emit(Events.ChannelCreate, ch);
    if (ch.isThread()) client.emit(Events.ThreadCreate, ch);
  },

  CHANNEL_UPDATE(client, d) {
    const data = d as APIChannel;
    const existing = client.channels.get(data.id);
    if (existing && existing.type === data.type) {
      const oldCh = Object.assign(
        Object.create(Object.getPrototypeOf(existing)),
        existing,
      ) as Channel;
      existing._patch(data);
      indexChannel(client, existing);
      client.emit(Events.ChannelUpdate, oldCh, existing);
      if (existing.isThread()) client.emit(Events.ThreadUpdate, oldCh, existing);
      return;
    }
    const newCh = Channel.from(client, data);
    if (!newCh) return;
    indexChannel(client, newCh);
    client.emit(Events.ChannelUpdate, existing ?? newCh, newCh);
    if (newCh.isThread()) client.emit(Events.ThreadUpdate, existing ?? newCh, newCh);
  },

  CHANNEL_UPDATE_BULK(client, d) {
    const data = d as GatewayChannelUpdateBulkDispatchData;
    for (const channel of data.channels ?? []) {
      channelHandlers.CHANNEL_UPDATE!(client, channel);
    }
  },

  CHANNEL_DELETE(client, d) {
    const { id } = d as { id: string; guild_id?: string };
    let channel = client.channels.get(id) ?? null;
    if (!channel && id) {
      // Global channel cache may have FIFO-evicted; still drop guild indexes.
      for (const guild of client.guilds.values()) {
        const nested = guild.channels.get(id);
        if (nested) {
          channel = nested;
          break;
        }
      }
    }
    if (!channel) return;
    client.channels.delete(id);
    if (channel.isGuild() && channel.guildId) {
      client.guilds.get(channel.guildId)?.channels.delete(id);
    }
    client.emit(Events.ChannelDelete, channel);
    if (channel.isThread()) client.emit(Events.ThreadDelete, channel);
  },

  CHANNEL_PINS_UPDATE(client, d) {
    const data = d as GatewayChannelPinsUpdateDispatchData;
    const payload: ChannelPinsUpdatePayload = {
      channelId: data.channel_id,
      guildId: data.guild_id ?? null,
      lastPinTimestamp: data.last_pin_timestamp ?? null,
    };
    const channel = client.channels.get(data.channel_id);
    if (channel && data.last_pin_timestamp !== undefined) {
      channel.lastPinTimestamp = data.last_pin_timestamp ?? null;
    }
    client.emit(Events.ChannelPinsUpdate, payload);
  },

  CHANNEL_RECIPIENT_ADD(client, d) {
    const data = d as GatewayChannelRecipientAddDispatchData;
    const user = client.getOrCreateUser(data.user);
    const payload: ChannelRecipientPayload = {
      channelId: data.channel_id,
      user,
    };
    client.emit(Events.ChannelRecipientAdd, payload);
  },

  CHANNEL_RECIPIENT_REMOVE(client, d) {
    const data = d as GatewayChannelRecipientRemoveDispatchData;
    const user = client.getOrCreateUser(data.user);
    const payload: ChannelRecipientPayload = {
      channelId: data.channel_id,
      user,
    };
    client.emit(Events.ChannelRecipientRemove, payload);
  },
};
