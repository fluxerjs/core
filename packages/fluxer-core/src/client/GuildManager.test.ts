import { Routes } from '@fluxerjs/types';
import { describe, expect, it, vi } from 'vitest';
import { fixtureGuild } from '../test/fixtures.js';
import { Client } from './Client.js';

describe('GuildManager', () => {
  it('preserves member_count from fetched guilds', async () => {
    const client = new Client();
    const data = fixtureGuild({ member_count: 42 });
    const get = vi.spyOn(client.rest, 'get').mockResolvedValue(data);

    const guild = await client.guilds.fetch(data.id);

    expect(get).toHaveBeenCalledWith(Routes.guild(data.id));
    expect(guild.memberCount).toBe(42);
  });
});
