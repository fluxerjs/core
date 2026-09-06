import { OverwriteType, Routes } from '@fluxerjs/types';
import { PermissionFlags } from '@fluxerjs/util';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Client } from '../../ClientCore/Client.js';
import { fixtureTextChannel } from '../../TestKit/Fixtures.js';
import { TextChannel } from './Guild.js';
import { PermissionOverwriteManager } from './PermissionOverwriteManager.js';

describe('TextChannel.setSlowmode', () => {
  it('PATCHes rate_limit_per_user via channel.edit', async () => {
    const client = new Client({ gatewayDeferHandlers: false });
    const channel = new TextChannel(
      client,
      fixtureTextChannel({
        id: 'c1',
        rate_limit_per_user: 0,
      }),
    );
    const patch = vi.spyOn(client.rest, 'patch').mockResolvedValue(
      fixtureTextChannel({
        id: 'c1',
        rate_limit_per_user: 10,
      }),
    );

    await channel.setSlowmode(10);

    expect(patch).toHaveBeenCalledWith(Routes.channel('c1'), {
      body: { rate_limit_per_user: 10 },
      auth: true,
    });
    expect(channel.rateLimitPerUser).toBe(10);
  });
});

describe('PermissionOverwriteManager', () => {
  let client: Client;
  let channel: TextChannel;

  beforeEach(() => {
    client = new Client({ gatewayDeferHandlers: false });
    channel = new TextChannel(
      client,
      fixtureTextChannel({
        id: 'c1',
        permission_overwrites: [],
      }),
    );
  });

  it('is a PermissionOverwriteManager on guild channels', () => {
    expect(channel.permissionOverwrites).toBeInstanceOf(PermissionOverwriteManager);
  });

  it('edit() resolves PermissionResolvable and updates cache', async () => {
    const put = vi.spyOn(client.rest, 'put').mockResolvedValue(undefined);

    await channel.permissionOverwrites.edit('role1', {
      type: OverwriteType.Role,
      deny: ['SendMessages'],
      allow: PermissionFlags.ViewChannel,
    });

    expect(put).toHaveBeenCalledWith(Routes.channelPermission('c1', 'role1'), {
      body: {
        type: OverwriteType.Role,
        allow: String(PermissionFlags.ViewChannel),
        deny: String(PermissionFlags.SendMessages),
      },
      auth: true,
    });
    expect(channel.permissionOverwrites.toJSON()).toEqual([
      {
        id: 'role1',
        type: OverwriteType.Role,
        allow: String(PermissionFlags.ViewChannel),
        deny: String(PermissionFlags.SendMessages),
      },
    ]);
  });

  it('delete() removes overwrite from cache', async () => {
    channel.permissionOverwrites._patch([
      { id: 'role1', type: OverwriteType.Role, allow: '0', deny: '2048' },
    ]);
    const del = vi.spyOn(client.rest, 'delete').mockResolvedValue(undefined);

    await channel.permissionOverwrites.delete('role1');

    expect(del).toHaveBeenCalledWith(Routes.channelPermission('c1', 'role1'), { auth: true });
    expect(channel.permissionOverwrites.size).toBe(0);
  });
});
