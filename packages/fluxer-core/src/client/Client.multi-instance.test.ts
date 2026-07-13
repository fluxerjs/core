import { describe, it, expect, vi, afterEach } from 'vitest';
import { Routes } from '@fluxerjs/types';
import type { APIInstance } from '@fluxerjs/types';
import { Client } from './Client.js';
import { User } from '../structures/User.js';
import { Invite } from '../structures/Invite.js';
import { InviteType } from '@fluxerjs/types';
import { ErrorCodes } from '../errors/ErrorCodes.js';
import { FluxerError } from '../errors/FluxerError.js';
import {
  DEFAULT_INSTANCE_ENDPOINTS,
  parseInstanceDiscovery,
  resolveInstanceEndpoints,
} from '../util/instance.js';

function selfHostedDiscovery(overrides: Partial<APIInstance['endpoints']> = {}): APIInstance {
  return {
    api_code_version: 1,
    endpoints: {
      api: 'https://api.selfhost.example',
      api_client: 'https://web.selfhost.example/api',
      api_public: 'https://api.selfhost.example',
      gateway: 'wss://gateway.selfhost.example',
      media: 'https://media.selfhost.example',
      static_cdn: 'https://static.selfhost.example',
      marketing: 'https://selfhost.example',
      admin: 'https://admin.selfhost.example',
      invite: 'https://invite.selfhost.example',
      gift: 'https://gift.selfhost.example',
      webapp: 'https://web.selfhost.example',
      ...overrides,
    },
    features: {
      voice_enabled: true,
      stripe_enabled: false,
      self_hosted: true,
      presigned_attachment_uploads: true,
      emails_enabled: false,
    },
  };
}

describe('multi-instance Client runtimes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to hosted Fluxer endpoints', () => {
    const client = new Client();
    expect(client.instance.endpoints).toEqual(DEFAULT_INSTANCE_ENDPOINTS);
    expect(client.instance.discovery).toBeNull();
  });

  it('accepts rest.api alone as a legacy API override', () => {
    const client = new Client({ rest: { api: 'https://api.custom.example/v1' } });
    expect(client.instance.endpoints.api).toBe('https://api.custom.example');
    expect(client.instance.endpoints.media).toBe(DEFAULT_INSTANCE_ENDPOINTS.media);
  });

  it('accepts a request-aware REST retry policy', () => {
    const retryPolicy = ({ method, defaultRetries }: { method: string; defaultRetries: number }) =>
      method === 'GET' ? defaultRetries : 0;
    const client = new Client({ rest: { retries: 3, retryPolicy } });

    expect(client.options.rest?.retryPolicy).toBe(retryPolicy);
  });

  it('applies explicit instance endpoint overrides', () => {
    const client = new Client({
      instance: {
        api: 'https://api.selfhost.example',
        media: 'https://media.selfhost.example',
        invite: 'https://invite.selfhost.example',
      },
    });
    expect(client.instance.endpoints.api).toBe('https://api.selfhost.example');
    expect(client.instance.endpoints.media).toBe('https://media.selfhost.example');
    expect(client.instance.endpoints.invite).toBe('https://invite.selfhost.example');
    expect(client.instance.endpoints.static_cdn).toBe(DEFAULT_INSTANCE_ENDPOINTS.static_cdn);
  });

  it('throws when instance.api and rest.api conflict', () => {
    expect(
      () =>
        new Client({
          instance: { api: 'https://api.a.example' },
          rest: { api: 'https://api.b.example' },
        }),
    ).toThrow(FluxerError);
    try {
      new Client({
        instance: { api: 'https://api.a.example' },
        rest: { api: 'https://api.b.example' },
      });
    } catch (err) {
      expect(err).toBeInstanceOf(FluxerError);
      expect((err as FluxerError).code).toBe(ErrorCodes.ConflictingInstanceConfig);
    }
  });

  it('allows matching instance.api and rest.api', () => {
    const client = new Client({
      instance: { api: 'https://api.selfhost.example' },
      rest: { api: 'https://api.selfhost.example/v1' },
    });
    expect(client.instance.endpoints.api).toBe('https://api.selfhost.example');
  });

  it('Client.fromDiscovery configures REST and endpoints from well-known doc', async () => {
    const discovery = selfHostedDiscovery();
    const { REST } = await import('@fluxerjs/rest');
    const restSpy = vi.spyOn(REST.prototype, 'get').mockImplementation(async (route: string) => {
      if (route === Routes.instanceDiscovery()) return discovery;
      throw new Error(`unexpected route ${route}`);
    });

    try {
      const client = await Client.fromDiscovery('https://bootstrap.selfhost.example');
      expect(restSpy).toHaveBeenCalledWith(Routes.instanceDiscovery(), { auth: false });
      expect(client.instance.endpoints.api).toBe('https://api.selfhost.example');
      expect(client.instance.endpoints.media).toBe('https://media.selfhost.example');
      expect(client.instance.discovery?.features?.self_hosted).toBe(true);
    } finally {
      restSpy.mockRestore();
    }
  });

  it('isolates two concurrent clients (hosts, tokens, caches, URLs)', async () => {
    const main = new Client();
    const self = new Client({ instance: selfHostedDiscovery() });

    expect(main.instance.endpoints.api).toBe('https://api.fluxer.app');
    expect(self.instance.endpoints.api).toBe('https://api.selfhost.example');

    main.rest.setToken('token-main');
    self.rest.setToken('token-self');
    expect(main.rest.token).toBe('token-main');
    expect(self.rest.token).toBe('token-self');

    const userMain = main.getOrCreateUser({
      id: 'same-id',
      username: 'MainUser',
      discriminator: '0',
      avatar: 'hash',
    });
    const userSelf = self.getOrCreateUser({
      id: 'same-id',
      username: 'SelfUser',
      discriminator: '0',
      avatar: 'hash',
    });
    expect(userMain.client).toBe(main);
    expect(userSelf.client).toBe(self);
    expect(userMain.avatarURL()).toContain('fluxerusercontent.com');
    expect(userSelf.avatarURL()).toContain('media.selfhost.example');
    expect(main.users.get('same-id')?.username).toBe('MainUser');
    expect(self.users.get('same-id')?.username).toBe('SelfUser');

    const inviteMain = new Invite(main, {
      code: 'abc',
      type: InviteType.Guild,
      guild: { id: 'g1', name: 'G' },
      channel: { id: 'c1', type: 0 },
    });
    const inviteSelf = new Invite(self, {
      code: 'abc',
      type: InviteType.Guild,
      guild: { id: 'g1', name: 'G' },
      channel: { id: 'c1', type: 0 },
    });
    expect(inviteMain.url).toBe('https://fluxer.gg/abc');
    expect(inviteSelf.url).toBe('https://invite.selfhost.example/abc');

    await main.destroy();
    expect(main.rest.token).toBeNull();
    expect(self.rest.token).toBe('token-self');
    expect(self.users.get('same-id')).toBeTruthy();
    expect(main.users.get('same-id')).toBeUndefined();
  });

  it('fetchInstance validates discovery and returns typed document', async () => {
    const client = new Client({ rest: { api: 'https://api.selfhost.example' } });
    const discovery = selfHostedDiscovery();
    const get = vi.spyOn(client.rest, 'get').mockResolvedValue(discovery);
    const result = await client.fetchInstance();
    expect(get).toHaveBeenCalledWith(Routes.instanceDiscovery(), { auth: false });
    expect(result.endpoints.api).toBe('https://api.selfhost.example');
  });

  it('fetchInstance rejects invalid discovery payloads', async () => {
    const client = new Client();
    vi.spyOn(client.rest, 'get').mockResolvedValue({ endpoints: {} });
    await expect(client.fetchInstance()).rejects.toMatchObject({
      code: ErrorCodes.InvalidInstanceDiscovery,
    });
  });

  it('parseInstanceDiscovery / resolveInstanceEndpoints helpers', () => {
    const parsed = parseInstanceDiscovery(selfHostedDiscovery({ api: 'https://x.example/v1/' }));
    expect(parsed.endpoints.api).toBe('https://x.example');
    const resolved = resolveInstanceEndpoints({ media: 'https://cdn.example' });
    expect(resolved.endpoints.media).toBe('https://cdn.example');
    expect(resolved.endpoints.api).toBe(DEFAULT_INSTANCE_ENDPOINTS.api);
  });

  it('User displayAvatarURL uses per-client static CDN', () => {
    const client = new Client({
      instance: { static_cdn: 'https://static.selfhost.example' },
    });
    const user = new User(client, {
      id: '0',
      username: 'u',
      discriminator: '0',
      avatar: null,
    });
    expect(user.displayAvatarURL()).toBe('https://static.selfhost.example/avatars/0.png');
  });
});
