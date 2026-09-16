import type { APIInstance } from '@fluxerjs/types';
import { InviteType, Routes } from '@fluxerjs/types';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Invite } from '../Domain/Invite.js';
import { User } from '../Domain/User.js';
import {
  DEFAULT_INSTANCE_ENDPOINTS,
  instanceDiscoveryUrl,
  parseInstanceDiscovery,
  resolveInstanceEndpoints,
} from '../Helpers/Instance.js';
import { ErrorCodes } from '../LibErrors/ErrorCodes.js';
import { FluxerError } from '../LibErrors/FluxerError.js';
import { fixtureInstance, fixtureUser } from '../TestKit/Fixtures.js';
import { Client } from './Client.js';

function selfHostedDiscovery(overrides: Partial<APIInstance['endpoints']> = {}): APIInstance {
  return fixtureInstance({
    endpoints: {
      api: 'https://web.selfhost.example/api',
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
  });
}

describe('multi-instance Client runtimes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to hosted Fluxer endpoints and REST on api_public', () => {
    const client = new Client();
    expect(client.instance.endpoints).toEqual(DEFAULT_INSTANCE_ENDPOINTS);
    expect(client.instance.endpoints.api).toBe('https://web.fluxer.app/api');
    expect(client.instance.endpoints.api_client).toBe('https://web.fluxer.app/api');
    expect(client.instance.endpoints.api_public).toBe('https://api.fluxer.app');
    expect(client.rest.baseUrl).toBe('https://api.fluxer.app/v1');
    expect(client.instance.discovery).toBeNull();
  });

  it('accepts rest.api alone as a legacy API override', () => {
    const client = new Client({ rest: { api: 'https://api.custom.example/v1' } });
    expect(client.instance.endpoints.api).toBe('https://api.custom.example');
    expect(client.instance.endpoints.api_public).toBe('https://api.custom.example');
    expect(client.rest.baseUrl).toBe('https://api.custom.example/v1');
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

  it('throws when instance.api_public and rest.api conflict', () => {
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
    expect(client.rest.baseUrl).toBe('https://api.selfhost.example/v1');
  });

  it('rest.api must match api_public when it differs from first-party api', () => {
    expect(
      () =>
        new Client({
          instance: {
            api: 'https://web.selfhost.example/api',
            api_public: 'https://api.selfhost.example',
          },
          rest: { api: 'https://web.selfhost.example/api' },
        }),
    ).toThrow(FluxerError);

    const client = new Client({
      instance: {
        api: 'https://web.selfhost.example/api',
        api_public: 'https://api.selfhost.example',
      },
      rest: { api: 'https://api.selfhost.example' },
    });
    expect(client.instance.endpoints.api).toBe('https://web.selfhost.example/api');
    expect(client.rest.baseUrl).toBe('https://api.selfhost.example/v1');
  });

  it('Client.fromDiscovery configures REST from api_public and keeps api for inspection', async () => {
    const discovery = selfHostedDiscovery();
    const wellKnown = instanceDiscoveryUrl('https://bootstrap.selfhost.example');
    expect(wellKnown).toBe('https://bootstrap.selfhost.example/.well-known/fluxer');
    expect(wellKnown).not.toContain('/v1');
    const { REST } = await import('@fluxerjs/rest');
    const restSpy = vi.spyOn(REST.prototype, 'get').mockImplementation(async (route: string) => {
      if (route === wellKnown) return discovery;
      throw new Error(`unexpected route ${route}`);
    });

    try {
      const client = await Client.fromDiscovery('https://bootstrap.selfhost.example');
      expect(restSpy).toHaveBeenCalledWith(wellKnown, { auth: false });
      expect(client.instance.endpoints.api).toBe('https://web.selfhost.example/api');
      expect(client.instance.endpoints.api_client).toBe('https://web.selfhost.example/api');
      expect(client.instance.endpoints.api_public).toBe('https://api.selfhost.example');
      expect(client.rest.baseUrl).toBe('https://api.selfhost.example/v1');
      expect(client.instance.endpoints.media).toBe('https://media.selfhost.example');
      expect(client.instance.discovery?.features?.self_hosted).toBe(true);
    } finally {
      restSpy.mockRestore();
    }
  });

  it('isolates two concurrent clients (hosts, tokens, caches, URLs)', async () => {
    const main = new Client();
    const self = new Client({ instance: selfHostedDiscovery() });

    expect(main.instance.endpoints.api).toBe('https://web.fluxer.app/api');
    expect(main.instance.endpoints.api_public).toBe('https://api.fluxer.app');
    expect(main.rest.baseUrl).toBe('https://api.fluxer.app/v1');
    expect(self.instance.endpoints.api).toBe('https://web.selfhost.example/api');
    expect(self.instance.endpoints.api_public).toBe('https://api.selfhost.example');
    expect(self.rest.baseUrl).toBe('https://api.selfhost.example/v1');

    main.rest.setToken('token-main');
    self.rest.setToken('token-self');
    expect(main.rest.token).toBe('token-main');
    expect(self.rest.token).toBe('token-self');

    const userMain = main.getOrCreateUser(
      fixtureUser({
        id: 'same-id',
        username: 'MainUser',
        avatar: 'hash',
      }),
    );
    const userSelf = self.getOrCreateUser(
      fixtureUser({
        id: 'same-id',
        username: 'SelfUser',
        avatar: 'hash',
      }),
    );
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
    expect(get).toHaveBeenCalledWith(Routes.instanceDiscovery(), {
      auth: false,
      unversioned: true,
    });
    expect(result.endpoints.api).toBe('https://web.selfhost.example/api');
    expect(result.endpoints.api_public).toBe('https://api.selfhost.example');
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
    expect(parsed.endpoints.api_public).toBe('https://api.selfhost.example');
    const resolved = resolveInstanceEndpoints({ media: 'https://cdn.example' });
    expect(resolved.endpoints.media).toBe('https://cdn.example');
    expect(resolved.endpoints.api).toBe(DEFAULT_INSTANCE_ENDPOINTS.api);
    expect(instanceDiscoveryUrl('https://fluxer.app/v1/')).toBe(
      'https://fluxer.app/.well-known/fluxer',
    );
    expect(instanceDiscoveryUrl('https://fluxer.app/v1/')).not.toContain('/v1');
  });

  it('User displayAvatarURL uses per-client static CDN', () => {
    const client = new Client({
      instance: { static_cdn: 'https://static.selfhost.example' },
    });
    const user = new User(
      client,
      fixtureUser({
        id: '0',
        username: 'u',
        avatar: null,
      }),
    );
    expect(user.displayAvatarURL()).toBe('https://static.selfhost.example/avatars/0.png');
  });

  it('passes ClientOptions.locale through to REST Accept-Language default', () => {
    const client = new Client({ locale: 'fr' });
    expect(client.options.locale).toBe('fr');
  });
});
