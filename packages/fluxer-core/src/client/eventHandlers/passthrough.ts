import type {
  GatewayChannelMemberCountsUpdateDispatchData,
  GatewayGuildCountsUpdateDispatchData,
  GatewayPresenceUpdateBulkDispatchData,
  GatewayPresenceUpdateDispatchData,
  GatewayTypingStartDispatchData,
  GatewayUserUpdateDispatchData,
  GatewayWebhooksUpdateDispatchData,
} from '@fluxerjs/types';

import { Events } from '../../util/Events.js';

import type {
  ChannelMemberCountsUpdatePayload,
  GuildCountsUpdatePayload,
  PresenceUpdateBulkPayload,
  PresenceUpdatePayload,
  TypingStartPayload,
  WebhooksUpdatePayload,
} from '../eventPayloads.js';

import { type HandlerMap, pass } from './types.js';

function toPresence(data: GatewayPresenceUpdateDispatchData): PresenceUpdatePayload {
  const custom = data.custom_status;

  return {
    userId: data.user.id,

    guildId: data.guild_id ?? null,

    status: data.status ?? null,

    activities: (data.activities ?? []).map((a) => ({
      name: a.name,

      type: a.type,

      url: a.url,
    })),

    customStatus: custom
      ? {
          text: custom.text ?? null,

          emojiId: custom.emoji_id ?? null,

          emojiName: custom.emoji_name ?? null,
        }
      : null,
  };
}

/** Emit-only and trivial handlers (voice stays wire-shaped). */

export const passthroughHandlers: HandlerMap = {
  VOICE_STATE_UPDATE: pass(Events.VoiceStateUpdate),

  VOICE_SERVER_UPDATE: pass(Events.VoiceServerUpdate),

  VOICE_STATE_ACK: pass(Events.VoiceStateAck),

  ENTRANCE_SOUND_PLAY: pass(Events.EntranceSoundPlay),

  TYPING_START(client, d) {
    const data = d as GatewayTypingStartDispatchData;

    const payload: TypingStartPayload = {
      channelId: data.channel_id,

      guildId: data.guild_id ?? null,

      userId: data.user_id,

      timestamp: data.timestamp,
    };

    client.emit(Events.TypingStart, payload);
  },

  PRESENCE_UPDATE(client, d) {
    client.emit(Events.PresenceUpdate, toPresence(d as GatewayPresenceUpdateDispatchData));
  },

  PRESENCE_UPDATE_BULK(client, d) {
    const data = d as GatewayPresenceUpdateBulkDispatchData;

    const payload: PresenceUpdateBulkPayload = {
      guildId: data.guild_id ?? null,

      presences: (data.presences ?? []).map(toPresence),
    };

    client.emit(Events.PresenceUpdateBulk, payload);
  },

  WEBHOOKS_UPDATE(client, d) {
    const data = d as GatewayWebhooksUpdateDispatchData;

    const payload: WebhooksUpdatePayload = {
      channelId: data.channel_id,

      guildId: data.guild_id,
    };

    client.emit(Events.WebhooksUpdate, payload);
  },

  RESUMED: (client) => {
    client.emit(Events.Resumed);
  },

  USER_UPDATE(client, d) {
    const data = d as GatewayUserUpdateDispatchData;

    const user = client.getOrCreateUser(data);

    if (client.user?.id === data.id) client.user._patch(data);

    client.emit(Events.UserUpdate, user);
  },

  GUILD_COUNTS_UPDATE(client, d) {
    const data = d as GatewayGuildCountsUpdateDispatchData;

    const counts = (data.counts ?? []).map((c) => ({
      guildId: c.guild_id,
      memberCount: c.member_count,
      onlineCount: c.online_count,
    }));
    for (const count of counts) {
      const guild = client.guilds.get(count.guildId);
      if (guild) guild.memberCount = count.memberCount;
    }

    const payload: GuildCountsUpdatePayload = {
      counts,
    };

    client.emit(Events.GuildCountsUpdate, payload);
  },

  CHANNEL_MEMBER_COUNTS_UPDATE(client, d) {
    const data = d as GatewayChannelMemberCountsUpdateDispatchData;

    const payload: ChannelMemberCountsUpdatePayload = {
      counts: (data.counts ?? []).map((c) => ({
        guildId: c.guild_id,

        channelId: c.channel_id,

        memberCount: c.member_count,

        onlineCount: c.online_count,
      })),
    };

    client.emit(Events.ChannelMemberCountsUpdate, payload);
  },

  // Session-scoped extras — keep wire-shaped (not bot-critical).

  USER_CONNECTIONS_UPDATE: pass(Events.UserConnectionsUpdate),

  WEBAUTHN_CREDENTIALS_UPDATE: pass(Events.WebAuthnCredentialsUpdate),
};
