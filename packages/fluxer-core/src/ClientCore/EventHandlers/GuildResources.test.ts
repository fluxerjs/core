import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Guild } from '../../Domain/Guild/Guild.js';
import { Role } from '../../Domain/Guild/Role.js';
import { Events } from '../../Helpers/Events.js';
import { dispatchForTest, fixtureGuild, fixtureRole } from '../../TestKit/Fixtures.js';
import { Client } from '../Client.js';
import type { GuildStickersUpdatePayload } from '../EventPayloads.js';

describe('guildResourceHandlers', () => {
  let client: Client;
  let guild: Guild;

  beforeEach(() => {
    client = new Client({ gatewayDeferHandlers: false });
    guild = new Guild(client, fixtureGuild({ id: 'g1' }));
    client.guilds.set(guild.id, guild);
  });

  it('GUILD_ROLE_UPDATE emits (oldRole, role)', async () => {
    const existing = new Role(client, fixtureRole({ id: 'r1', name: 'Old' }), 'g1');
    guild.roles.set(existing.id, existing);
    const emit = vi.spyOn(client, 'emit');

    await dispatchForTest(client, 'GUILD_ROLE_UPDATE', {
      guild_id: 'g1',
      role: fixtureRole({ id: 'r1', name: 'New' }),
    });

    const call = emit.mock.calls.find((c) => c[0] === Events.GuildRoleUpdate);
    expect(call?.[1]).toMatchObject({ name: 'Old' });
    expect(call?.[2]).toMatchObject({ name: 'New' });
  });

  it('GUILD_ROLE_DELETE emits (role, guildId, roleId)', async () => {
    const existing = new Role(client, fixtureRole({ id: 'r1', name: 'Gone' }), 'g1');
    guild.roles.set(existing.id, existing);
    const emit = vi.spyOn(client, 'emit');

    await dispatchForTest(client, 'GUILD_ROLE_DELETE', { guild_id: 'g1', role_id: 'r1' });

    expect(guild.roles.get('r1')).toBeUndefined();
    const call = emit.mock.calls.find((c) => c[0] === Events.GuildRoleDelete);
    expect(call?.[1]).toBe(existing);
    expect(call?.[2]).toBe('g1');
    expect(call?.[3]).toBe('r1');
  });

  it('GUILD_EMOJIS_UPDATE syncs cache and emits', async () => {
    const emit = vi.spyOn(client, 'emit');
    await dispatchForTest(client, 'GUILD_EMOJIS_UPDATE', {
      guild_id: 'g1',
      emojis: [{ id: 'e1', name: 'wave', animated: false }],
    });

    expect(guild.emojis.get('e1')?.name).toBe('wave');
    const call = emit.mock.calls.find((c) => c[0] === Events.GuildEmojisUpdate);
    expect(call).toBeDefined();
    expect(call![1]).toMatchObject({ guildId: 'g1' });
    expect((call![1] as { emojis: unknown[] }).emojis).toHaveLength(1);
  });

  it('GUILD_STICKERS_UPDATE emits GuildStickersUpdatePayload', async () => {
    const emit = vi.spyOn(client, 'emit');
    await dispatchForTest(client, 'GUILD_STICKERS_UPDATE', {
      guild_id: 'g1',
      stickers: [
        {
          id: 's1',
          name: 'cool',
          description: '',
          tags: [],
          type: 1,
          format_type: 1,
          available: true,
          guild_id: 'g1',
        },
      ],
    });

    const payload = emit.mock.calls.find((c) => c[0] === Events.GuildStickersUpdate)?.[1] as
      | GuildStickersUpdatePayload
      | undefined;
    expect(payload?.guildId).toBe('g1');
    expect(payload?.stickers).toHaveLength(1);
  });
});
