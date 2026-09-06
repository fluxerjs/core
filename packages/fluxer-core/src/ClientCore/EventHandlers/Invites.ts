import {
  type APIChannelPartial,
  type APIGuildPartial,
  type APIInvite,
  ChannelType,
  type GatewayInviteCreateDispatchData,
  type GatewayInviteDeleteDispatchData,
  InviteType,
} from '@fluxerjs/types';
import { Invite } from '../../Domain/Invite.js';
import { Events } from '../../Helpers/Events.js';
import type { Client } from '../Client.js';
import type { InviteDeletePayload } from '../EventPayloads.js';
import { asRecord, num, str } from './Helpers.js';
import type { HandlerMap } from './Types.js';

function normalizeInviteCreate(
  client: Client,
  payload: GatewayInviteCreateDispatchData,
): APIInvite | null {
  const raw = asRecord(payload);
  const code = str(raw?.code);
  if (!raw || !code) return null;

  const typeNum = num(raw.type);
  const type = typeNum === InviteType.GroupDM ? InviteType.GroupDM : InviteType.Guild;

  const shared = {
    code,
    inviter: (raw.inviter as APIInvite['inviter']) ?? null,
    member_count: num(raw.member_count),
    expires_at: (raw.expires_at as string | null | undefined) ?? undefined,
    temporary: typeof raw.temporary === 'boolean' ? raw.temporary : undefined,
    created_at: str(raw.created_at),
    uses: num(raw.uses),
    max_uses: num(raw.max_uses),
    max_age: num(raw.max_age),
  };

  const guildObj = asRecord(raw.guild);
  const channelObj = asRecord(raw.channel);
  const guildId = str(guildObj?.id) ?? str(raw.guild_id) ?? '0';
  const channelId = str(channelObj?.id) ?? str(raw.channel_id) ?? '0';
  const cachedGuild = guildId !== '0' ? client.guilds.get(guildId) : null;
  const cachedChannel = channelId !== '0' ? client.channels.get(channelId) : null;

  const channel: APIChannelPartial = {
    id: channelId,
    type: (num(channelObj?.type) ?? cachedChannel?.type ?? ChannelType.GuildText) as ChannelType,
    name: str(channelObj?.name) ?? cachedChannel?.name ?? null,
    icon: (channelObj?.icon as string | null | undefined) ?? null,
  };

  if (type === InviteType.GroupDM) return { ...shared, type, channel };

  return {
    ...shared,
    type: InviteType.Guild,
    guild: {
      id: guildId,
      name: str(guildObj?.name) ?? cachedGuild?.name ?? 'Unknown Guild',
      icon: (guildObj?.icon as string | null | undefined) ?? null,
      banner: (guildObj?.banner as string | null | undefined) ?? null,
      splash: (guildObj?.splash as string | null | undefined) ?? null,
      features: Array.isArray(guildObj?.features) ? (guildObj.features as string[]) : undefined,
    } satisfies APIGuildPartial,
    channel,
    presence_count: num(raw.presence_count),
  };
}

export const inviteHandlers: HandlerMap = {
  INVITE_CREATE(client, d) {
    const data = normalizeInviteCreate(client, d as GatewayInviteCreateDispatchData);
    if (!data) {
      client.emit(
        Events.Debug,
        '[Gateway] INVITE_CREATE payload had no invite code (documented as possibly empty)',
      );
      return;
    }
    client.emit(Events.InviteCreate, new Invite(client, data));
  },

  INVITE_DELETE(client, d) {
    const data = d as GatewayInviteDeleteDispatchData;
    const payload: InviteDeletePayload = {
      code: data.code,
      guildId: data.guild_id ?? null,
      channelId: data.channel_id ?? null,
    };
    client.emit(Events.InviteDelete, payload);
  },
};
