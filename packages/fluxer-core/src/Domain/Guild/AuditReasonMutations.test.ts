import { Routes } from '@fluxerjs/types';
import { describe, expect, it, vi } from 'vitest';
import { AUDIT_LOG_REASON_HEADER } from '../../Helpers/AuditReason.js';
import {
  createTestClient,
  fixtureGuild,
  fixtureMember,
  fixtureMessage,
  fixtureTextChannel,
  fixtureUser,
} from '../../TestKit/Fixtures.js';
import { TextChannel } from '../Channel/Guild.js';
import { Message } from '../Message/Message.js';
import { Guild } from './Guild.js';
import { GuildEmoji } from './GuildEmoji.js';
import { GuildMember } from './GuildMember.js';
import { GuildSticker } from './GuildSticker.js';
import { Role } from './Role.js';

const reason = 'cool down';
const encoded = encodeURIComponent(reason);
const headers = { [AUDIT_LOG_REASON_HEADER]: encoded };

function guildWithClient() {
  const client = createTestClient();
  const guild = new Guild(client, fixtureGuild({ id: 'g1' }));
  client.guilds.set(guild.id, guild);
  return { client, guild };
}

describe('X-Audit-Log-Reason mutations', () => {
  it('ban sends the header and keeps JSON reason', async () => {
    const { client, guild } = guildWithClient();
    const put = vi.spyOn(client.rest, 'put').mockResolvedValue(undefined);
    await guild.ban('u1', { reason, deleteMessageDays: 1 });
    expect(put).toHaveBeenCalledWith(Routes.guildBan('g1', 'u1'), {
      body: { reason, delete_message_days: 1 },
      auth: true,
      headers,
    });
  });

  it('kick and unban send the header with no JSON body', async () => {
    const { client, guild } = guildWithClient();
    const del = vi.spyOn(client.rest, 'delete').mockResolvedValue(undefined);
    await guild.kick('u1', reason);
    await guild.unban('u1', reason);
    expect(del).toHaveBeenNthCalledWith(1, Routes.guildMember('g1', 'u1'), {
      auth: true,
      headers,
    });
    expect(del).toHaveBeenNthCalledWith(2, Routes.guildBan('g1', 'u1'), {
      auth: true,
      headers,
    });
  });

  it('timeout sends the header and keeps timeout_reason in the body', async () => {
    const { client, guild } = guildWithClient();
    const member = new GuildMember(
      client,
      fixtureMember({ user: fixtureUser({ id: 'u1' }) }),
      guild,
    );
    const patch = vi
      .spyOn(client.rest, 'patch')
      .mockResolvedValue(fixtureMember({ user: fixtureUser({ id: 'u1' }) }));
    await member.timeout(60_000, reason);
    expect(patch).toHaveBeenCalledWith(
      Routes.guildMember('g1', 'u1'),
      expect.objectContaining({
        auth: true,
        headers,
        body: expect.objectContaining({ timeout_reason: reason }),
      }),
    );
  });

  it('role create/edit/delete send the header and omit reason from JSON', async () => {
    const { client, guild } = guildWithClient();
    const post = vi.spyOn(client.rest, 'post').mockResolvedValue({
      id: 'r1',
      name: 'mod',
      color: 0,
      permissions: '0',
      position: 1,
      hoist: false,
      mentionable: false,
    });
    await guild.createRole({ name: 'mod', reason });
    expect(post).toHaveBeenCalledWith(Routes.guildRoles('g1'), {
      body: { name: 'mod' },
      auth: true,
      headers,
    });

    const role = new Role(
      client,
      {
        id: 'r1',
        name: 'mod',
        color: 0,
        permissions: '0',
        position: 1,
        hoist: false,
        mentionable: false,
      },
      'g1',
    );
    const patch = vi.spyOn(client.rest, 'patch').mockResolvedValue({
      id: 'r1',
      name: 'staff',
      color: 0,
      permissions: '0',
      position: 1,
      hoist: false,
      mentionable: false,
    });
    await role.edit({ name: 'staff', reason });
    expect(patch).toHaveBeenCalledWith(Routes.guildRole('g1', 'r1'), {
      body: { name: 'staff' },
      auth: true,
      headers,
    });

    const del = vi.spyOn(client.rest, 'delete').mockResolvedValue(undefined);
    await role.delete(reason);
    expect(del).toHaveBeenCalledWith(Routes.guildRole('g1', 'r1'), { auth: true, headers });
  });

  it('channel edit/delete send the header and omit reason from JSON', async () => {
    const { client } = guildWithClient();
    const channel = new TextChannel(client, fixtureTextChannel({ id: 'c1', guild_id: 'g1' }));
    const patch = vi
      .spyOn(client.rest, 'patch')
      .mockResolvedValue(fixtureTextChannel({ id: 'c1', guild_id: 'g1', name: 'general' }));
    await channel.edit({ name: 'general', reason });
    expect(patch).toHaveBeenCalledWith(Routes.channel('c1'), {
      body: { name: 'general' },
      auth: true,
      headers,
    });

    const del = vi.spyOn(client.rest, 'delete').mockResolvedValue(undefined);
    await channel.delete({ reason });
    expect(del).toHaveBeenCalledWith(Routes.channel('c1'), {
      body: undefined,
      auth: true,
      headers,
    });
  });

  it('emoji create/edit/delete send the header and omit reason from JSON', async () => {
    const { client, guild } = guildWithClient();
    const post = vi.spyOn(client.rest, 'post').mockResolvedValue({
      id: 'e1',
      name: 'wave',
      animated: false,
      nsfw: false,
    });
    await guild.createEmoji({ name: 'wave', image: 'data:', reason });
    expect(post).toHaveBeenCalledWith(Routes.guildEmojis('g1'), {
      body: { name: 'wave', image: 'data:' },
      auth: true,
      headers,
    });

    const emoji = new GuildEmoji(
      client,
      { id: 'e1', name: 'wave', animated: false, nsfw: false },
      'g1',
    );
    const patch = vi.spyOn(client.rest, 'patch').mockResolvedValue({
      id: 'e1',
      name: 'wave2',
      animated: false,
      nsfw: false,
    });
    await emoji.edit({ name: 'wave2', reason });
    expect(patch).toHaveBeenCalledWith(Routes.guildEmoji('g1', 'e1'), {
      body: { name: 'wave2' },
      auth: true,
      headers,
    });

    const del = vi.spyOn(client.rest, 'delete').mockResolvedValue(undefined);
    await emoji.delete(reason);
    expect(del).toHaveBeenCalledWith(Routes.guildEmoji('g1', 'e1'), { auth: true, headers });
  });

  it('sticker create/edit/delete send the header and omit reason from JSON', async () => {
    const { client, guild } = guildWithClient();
    const post = vi.spyOn(client.rest, 'post').mockResolvedValue({
      id: 's1',
      name: 'hi',
      description: '',
      tags: [],
      animated: false,
      nsfw: false,
    });
    await guild.createSticker({ name: 'hi', image: 'data:', reason });
    expect(post).toHaveBeenCalledWith(Routes.guildStickers('g1'), {
      body: { name: 'hi', image: 'data:' },
      auth: true,
      headers,
    });

    const sticker = new GuildSticker(
      client,
      { id: 's1', name: 'hi', description: '', tags: [], animated: false, nsfw: false },
      'g1',
    );
    const patch = vi.spyOn(client.rest, 'patch').mockResolvedValue({
      id: 's1',
      name: 'hey',
      description: 'x',
      tags: [],
      animated: false,
      nsfw: false,
    });
    await sticker.edit({ name: 'hey', description: 'x', reason });
    expect(patch).toHaveBeenCalledWith(Routes.guildSticker('g1', 's1'), {
      body: { name: 'hey', description: 'x' },
      auth: true,
      headers,
    });

    const del = vi.spyOn(client.rest, 'delete').mockResolvedValue(undefined);
    await sticker.delete(reason);
    expect(del).toHaveBeenCalledWith(Routes.guildSticker('g1', 's1'), { auth: true, headers });
  });

  it('message delete sends the header', async () => {
    const client = createTestClient();
    const msg = new Message(
      client,
      fixtureMessage({
        id: 'm1',
        channel_id: 'c1',
        author: fixtureUser({ id: 'u1' }),
      }),
    );
    const del = vi.spyOn(client.rest, 'delete').mockResolvedValue(undefined);
    await msg.delete(reason);
    expect(del).toHaveBeenCalledWith(Routes.channelMessage('c1', 'm1'), { headers });
  });
});
