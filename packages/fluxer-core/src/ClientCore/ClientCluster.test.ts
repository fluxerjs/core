import { REST } from '@fluxerjs/rest';
import type { APIInstance } from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Events } from '../Helpers/Events.js';
import { ErrorCodes } from '../LibErrors/ErrorCodes.js';
import { fixtureInstance } from '../TestKit/Fixtures.js';
import { Client } from './Client.js';
import {
  BETA_CLIENT_CLUSTER_WARNING,
  ClientCluster,
  resetClientClusterBetaWarningForTests,
} from './ClientCluster.js';
import { ClientClusterEvents } from './ClientClusterEvents.js';
import * as GatewayReady from './GatewayReady.js';

function discoveryDoc(api = 'https://api.selfhost.example'): APIInstance {
  return fixtureInstance({
    endpoints: {
      api,
      api_client: `${api}/client`,
      api_public: api,
      gateway: 'wss://gateway.selfhost.example',
      media: 'https://media.selfhost.example',
      static_cdn: 'https://static.selfhost.example',
      marketing: 'https://selfhost.example',
      admin: 'https://admin.selfhost.example',
      invite: 'https://invite.selfhost.example',
      gift: 'https://gift.selfhost.example',
      webapp: 'https://web.selfhost.example',
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

function mockSuccessfulLogin(): void {
  vi.spyOn(GatewayReady, 'connectClientGateway').mockImplementation(async (client) => {
    const ws = { destroy: vi.fn() };
    client._ws = ws as never;
    queueMicrotask(() => {
      client.user = { username: 'bot', id: '1' } as never;
      client.readyAt = new Date();
      client.emit(Events.Ready);
    });
    return ws as never;
  });
}

describe('ClientCluster (beta)', () => {
  beforeEach(() => {
    resetClientClusterBetaWarningForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits a beta process warning once by default', () => {
    const emitWarning = vi.spyOn(process, 'emitWarning').mockImplementation(() => undefined);
    new ClientCluster();
    new ClientCluster();
    expect(emitWarning).toHaveBeenCalledTimes(1);
    expect(emitWarning.mock.calls[0]?.[0]).toBe(BETA_CLIENT_CLUSTER_WARNING);
    expect(emitWarning.mock.calls[0]?.[1]).toMatchObject({
      type: 'FluxerClientClusterBeta',
    });
  });

  it('can suppress the beta warning', () => {
    const emitWarning = vi.spyOn(process, 'emitWarning').mockImplementation(() => undefined);
    new ClientCluster({ suppressBetaWarning: true });
    expect(emitWarning).not.toHaveBeenCalled();
  });

  it('starts empty and does not require a main instance', () => {
    const cluster = new ClientCluster({ suppressBetaWarning: true });
    expect(cluster.size).toBe(0);
    expect(cluster.values()).toEqual([]);
  });

  it('adds a hosted runtime with a required token', async () => {
    mockSuccessfulLogin();
    const cluster = new ClientCluster({ suppressBetaWarning: true });
    const rt = await cluster.add({ id: 'hosted', token: 'token-hosted' });
    expect(rt.id).toBe('hosted');
    expect(rt.client.instance.endpoints.api).toBe('https://api.fluxer.app');
    expect(rt.client.rest.token).toBe('token-hosted');
    expect(cluster.size).toBe(1);
    expect(cluster.has('hosted')).toBe(true);
    // Token must not appear on the public runtime object
    expect(Object.keys(rt).sort()).toEqual(['client', 'id', 'lastError', 'status']);
    expect('token' in rt).toBe(false);
    expect(rt.lastError).toBeUndefined();
  });

  it('rejects missing token / id', async () => {
    const cluster = new ClientCluster({ suppressBetaWarning: true });
    await expect(cluster.add({ id: '', token: 't' })).rejects.toMatchObject({
      code: ErrorCodes.InvalidRuntimeConfig,
    });
    await expect(cluster.add({ id: 'x', token: '' })).rejects.toMatchObject({
      code: ErrorCodes.InvalidRuntimeConfig,
    });
  });

  it('adds via discovery with a distinct token', async () => {
    mockSuccessfulLogin();
    const doc = discoveryDoc();
    vi.spyOn(REST.prototype, 'get').mockImplementation(async (route: string) => {
      if (route === Routes.instanceDiscovery()) return doc;
      throw new Error(`unexpected ${route}`);
    });
    const cluster = new ClientCluster({ suppressBetaWarning: true });
    const rt = await cluster.add({
      id: 'self',
      token: 'token-self',
      discovery: 'https://bootstrap.selfhost.example',
    });
    expect(rt.client.instance.endpoints.api).toBe('https://api.selfhost.example');
    expect(rt.client.rest.token).toBe('token-self');
  });

  it('runs configure before login for dynamically added clients', async () => {
    const order: string[] = [];
    vi.spyOn(GatewayReady, 'connectClientGateway').mockImplementation(async (client) => {
      order.push('login');
      const ws = { destroy: vi.fn() };
      client._ws = ws as never;
      return ws as never;
    });
    const cluster = new ClientCluster({
      suppressBetaWarning: true,
      configure: (rt) => {
        order.push(`configure:${rt.id}`);
        rt.client.on(Events.MessageCreate, () => undefined);
      },
    });
    await cluster.add({ id: 'a', token: 'tok-a' });
    expect(order).toEqual(['configure:a', 'login']);
  });

  it('supports adding a second runtime after the first is connected', async () => {
    mockSuccessfulLogin();
    const cluster = new ClientCluster({ suppressBetaWarning: true });
    await cluster.add({ id: 'one', token: 't1' });
    await cluster.add({
      id: 'two',
      token: 't2',
      clientOptions: { instance: { api: 'https://api.two.example' } },
    });
    expect(cluster.size).toBe(2);
    expect(cluster.get('one')?.client.rest.token).toBe('t1');
    expect(cluster.get('two')?.client.rest.token).toBe('t2');
    expect(cluster.get('two')?.client.instance.endpoints.api).toBe('https://api.two.example');
  });

  it('rejects duplicate ids', async () => {
    mockSuccessfulLogin();
    const cluster = new ClientCluster({ suppressBetaWarning: true });
    await cluster.add({ id: 'a', token: 't1' });
    await expect(cluster.add({ id: 'a', token: 't2' })).rejects.toMatchObject({
      code: ErrorCodes.DuplicateRuntimeId,
    });
    expect(cluster.get('a')?.client.rest.token).toBe('t1');
  });

  it('rejects concurrent duplicate adds', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.spyOn(GatewayReady, 'connectClientGateway').mockImplementation(async (client) => {
      await gate;
      const ws = { destroy: vi.fn() };
      client._ws = ws as never;
      return ws as never;
    });
    const cluster = new ClientCluster({ suppressBetaWarning: true });
    const first = cluster.add({ id: 'same', token: 't1' });
    await Promise.resolve();
    const second = cluster.add({ id: 'same', token: 't2' });
    await expect(second).rejects.toMatchObject({ code: ErrorCodes.DuplicateRuntimeId });
    release();
    await first;
    expect(cluster.size).toBe(1);
  });

  it('rejects already-logged-in prebuilt clients', async () => {
    const client = new Client();
    client._ws = { destroy: vi.fn() } as never;
    const cluster = new ClientCluster({ suppressBetaWarning: true });
    await expect(cluster.add({ id: 'x', token: 't', client })).rejects.toMatchObject({
      code: ErrorCodes.RuntimeAlreadyLoggedIn,
    });
  });

  it('rolls back on configure failure without leaving a runtime', async () => {
    mockSuccessfulLogin();
    const cluster = new ClientCluster({
      suppressBetaWarning: true,
      configure: () => {
        throw new Error('configure failed');
      },
    });
    await expect(cluster.add({ id: 'bad', token: 'secret-token' })).rejects.toThrow(
      'configure failed',
    );
    expect(cluster.has('bad')).toBe(false);
    expect(cluster.size).toBe(0);
  });

  it('rolls back on login failure and clears the token', async () => {
    vi.spyOn(GatewayReady, 'connectClientGateway').mockRejectedValue(new Error('gateway down'));
    const cluster = new ClientCluster({ suppressBetaWarning: true });
    const client = new Client();
    await expect(cluster.add({ id: 'x', token: 'secret-token', client })).rejects.toThrow(
      'gateway down',
    );
    expect(cluster.has('x')).toBe(false);
    expect(client.rest.token).toBeNull();
    expect(client._ws).toBeNull();
  });

  it('aborts an in-flight add when remove is called', async () => {
    let resolveConnect!: (ws: { destroy: () => void }) => void;
    const connectPromise = new Promise<{ destroy: () => void }>((resolve) => {
      resolveConnect = resolve;
    });
    vi.spyOn(GatewayReady, 'connectClientGateway').mockImplementation(
      async (client, _token, signal) => {
        return new Promise((resolve, reject) => {
          const onAbort = (): void => {
            client._ws = null;
            reject(
              Object.assign(new Error('Connection aborted'), {
                code: ErrorCodes.GatewayConnectionAborted,
              }),
            );
          };
          signal?.addEventListener('abort', onAbort, { once: true });
          void connectPromise.then((ws) => {
            if (signal?.aborted) {
              onAbort();
              return;
            }
            client._ws = ws as never;
            resolve(ws as never);
          });
        });
      },
    );

    const cluster = new ClientCluster({ suppressBetaWarning: true });
    const addPromise = cluster.add({ id: 'slow', token: 't' });
    await Promise.resolve();
    const removed = cluster.remove('slow');
    resolveConnect({ destroy: vi.fn() });
    await expect(addPromise).rejects.toMatchObject({
      code: ErrorCodes.GatewayConnectionAborted,
    });
    expect(await removed).toBe(true);
    expect(cluster.size).toBe(0);
  });

  it('remove leaves sibling runtimes connected', async () => {
    mockSuccessfulLogin();
    const cluster = new ClientCluster({ suppressBetaWarning: true });
    await cluster.add({ id: 'keep', token: 'tk' });
    await cluster.add({ id: 'drop', token: 'td' });
    expect(await cluster.remove('drop')).toBe(true);
    expect(cluster.has('drop')).toBe(false);
    expect(cluster.get('keep')?.client.rest.token).toBe('tk');
    expect(await cluster.remove('missing')).toBe(false);
  });

  it('emits lifecycle events and cleans up listeners on remove', async () => {
    mockSuccessfulLogin();
    const cluster = new ClientCluster({ suppressBetaWarning: true });
    const added: string[] = [];
    const ready: string[] = [];
    const removed: string[] = [];
    cluster.on(ClientClusterEvents.RuntimeAdded, (rt) => added.push(rt.id));
    cluster.on(ClientClusterEvents.RuntimeReady, (rt) => ready.push(rt.id));
    cluster.on(ClientClusterEvents.RuntimeRemoved, (rt) => removed.push(rt.id));

    await cluster.add({ id: 'r1', token: 't' });
    await vi.waitFor(() => expect(ready).toContain('r1'));
    await cluster.remove('r1');
    expect(added).toEqual(['r1']);
    expect(removed).toEqual(['r1']);
  });

  it('destroy is idempotent and blocks further adds', async () => {
    mockSuccessfulLogin();
    const cluster = new ClientCluster({ suppressBetaWarning: true });
    await cluster.add({ id: 'a', token: 't' });
    await cluster.destroy();
    await cluster.destroy();
    expect(cluster.size).toBe(0);
    await expect(cluster.add({ id: 'b', token: 't2' })).rejects.toMatchObject({
      code: ErrorCodes.ClusterDestroyed,
    });
  });

  it('does not leak tokens into RuntimeError payloads', async () => {
    mockSuccessfulLogin();
    const cluster = new ClientCluster({ suppressBetaWarning: true });
    const seen: Array<{ id: string; err: Error }> = [];
    cluster.on(ClientClusterEvents.RuntimeError, (rt, err) => {
      seen.push({ id: rt.id, err });
    });
    const rt = await cluster.add({ id: 'e', token: 'super-secret-token' });
    rt.client.emit(Events.Error, new Error('boom'));
    expect(seen).toHaveLength(1);
    expect(seen[0]?.id).toBe('e');
    expect(seen[0]?.err.message).toBe('boom');
    expect('token' in (seen[0] as object)).toBe(false);
  });

  it('sets error status and lastError on client Error, clears on Ready', async () => {
    mockSuccessfulLogin();
    const cluster = new ClientCluster({ suppressBetaWarning: true });
    const rt = await cluster.add({ id: 'e', token: 't' });
    await vi.waitFor(() => expect(rt.status).toBe('ready'));
    rt.client.emit(Events.Error, new Error('gateway glitch'));
    expect(rt.status).toBe('error');
    expect(rt.lastError?.message).toBe('gateway glitch');
    rt.client.emit(Events.Ready);
    expect(rt.status).toBe('ready');
    expect(rt.lastError).toBeUndefined();
  });

  it('restarts a hosted runtime with a freshly supplied token', async () => {
    mockSuccessfulLogin();
    const cluster = new ClientCluster({ suppressBetaWarning: true });
    const lifecycle: string[] = [];
    cluster.on(ClientClusterEvents.RuntimeRemoved, (rt) => lifecycle.push(`removed:${rt.id}`));
    cluster.on(ClientClusterEvents.RuntimeAdded, (rt) => lifecycle.push(`added:${rt.id}`));
    cluster.on(ClientClusterEvents.RuntimeReady, (rt) => lifecycle.push(`ready:${rt.id}`));

    await cluster.add({ id: 'hosted', token: 'old-token' });
    await vi.waitFor(() => expect(lifecycle).toContain('ready:hosted'));
    const restarted = await cluster.restart('hosted', { token: 'new-token' });
    expect(restarted.id).toBe('hosted');
    expect(restarted.client.rest.token).toBe('new-token');
    expect(cluster.size).toBe(1);
    expect(lifecycle.filter((x) => x === 'removed:hosted')).toHaveLength(1);
    expect(lifecycle.filter((x) => x === 'added:hosted')).toHaveLength(2);
    expect('token' in restarted).toBe(false);
    expect(Object.keys(restarted)).not.toContain('token');
  });

  it('restarts a discovery runtime preserving endpoints', async () => {
    mockSuccessfulLogin();
    const doc = discoveryDoc();
    vi.spyOn(REST.prototype, 'get').mockImplementation(async (route: string) => {
      if (route === Routes.instanceDiscovery()) return doc;
      throw new Error(`unexpected ${route}`);
    });
    const cluster = new ClientCluster({ suppressBetaWarning: true });
    await cluster.add({
      id: 'self',
      token: 't1',
      discovery: 'https://bootstrap.selfhost.example',
    });
    const restarted = await cluster.restart('self', { token: 't2' });
    expect(restarted.client.instance.endpoints.api).toBe('https://api.selfhost.example');
    expect(restarted.client.rest.token).toBe('t2');
  });

  it('rejects restart for unknown, destroyed, or prebuilt runtimes', async () => {
    mockSuccessfulLogin();
    const cluster = new ClientCluster({ suppressBetaWarning: true });
    await expect(cluster.restart('missing', { token: 't' })).rejects.toMatchObject({
      code: ErrorCodes.RuntimeNotFound,
    });

    const prebuilt = new Client();
    await cluster.add({ id: 'pre', token: 't', client: prebuilt });
    await expect(cluster.restart('pre', { token: 't2' })).rejects.toMatchObject({
      code: ErrorCodes.RuntimeConflict,
    });

    await cluster.destroy();
    await expect(cluster.restart('pre', { token: 't3' })).rejects.toMatchObject({
      code: ErrorCodes.ClusterDestroyed,
    });
  });

  it('addAll settles mixed success and failure', async () => {
    mockSuccessfulLogin();
    const cluster = new ClientCluster({ suppressBetaWarning: true });
    const results = await cluster.addAll([
      { id: 'ok', token: 't1' },
      { id: '', token: 't2' },
      { id: 'ok2', token: 't3' },
    ]);
    expect(results).toHaveLength(3);
    expect(results[0]?.status).toBe('fulfilled');
    expect(results[1]?.status).toBe('rejected');
    expect(results[2]?.status).toBe('fulfilled');
    expect(cluster.size).toBe(2);
    expect(cluster.has('ok')).toBe(true);
    expect(cluster.has('ok2')).toBe(true);
  });

  it('runtimeValues yields the same runtimes as values()', async () => {
    mockSuccessfulLogin();
    const cluster = new ClientCluster({ suppressBetaWarning: true });
    await cluster.add({ id: 'a', token: 't1' });
    await cluster.add({ id: 'b', token: 't2' });
    const fromArray = cluster
      .values()
      .map((r) => r.id)
      .sort();
    const fromIter = [...cluster.runtimeValues()].map((r) => r.id).sort();
    expect(fromIter).toEqual(fromArray);
  });

  it('destroy clears cluster lifecycle listeners', async () => {
    mockSuccessfulLogin();
    const cluster = new ClientCluster({ suppressBetaWarning: true });
    cluster.on(ClientClusterEvents.RuntimeReady, () => undefined);
    cluster.on(ClientClusterEvents.RuntimeError, () => undefined);
    expect(cluster.listenerCount(ClientClusterEvents.RuntimeReady)).toBe(1);
    await cluster.add({ id: 'a', token: 't' });
    await cluster.destroy();
    expect(cluster.listenerCount(ClientClusterEvents.RuntimeReady)).toBe(0);
    expect(cluster.listenerCount(ClientClusterEvents.RuntimeError)).toBe(0);
  });
});

describe('Client login abort / rollback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('clears token and _ws when connectClientGateway fails', async () => {
    vi.spyOn(GatewayReady, 'connectClientGateway').mockRejectedValue(new Error('fail'));
    const client = new Client();
    await expect(client.login('tok')).rejects.toThrow('fail');
    expect(client.rest.token).toBeNull();
    expect(client._ws).toBeNull();
  });

  it('aborts login when signal aborts', async () => {
    vi.spyOn(GatewayReady, 'connectClientGateway').mockImplementation(
      async (_client, _token, signal) => {
        await new Promise<void>((_resolve, reject) => {
          signal?.addEventListener(
            'abort',
            () =>
              reject(
                Object.assign(new Error('Connection aborted'), {
                  code: ErrorCodes.GatewayConnectionAborted,
                }),
              ),
            { once: true },
          );
        });
        return { destroy: vi.fn() } as never;
      },
    );
    const client = new Client();
    const ac = new AbortController();
    const p = client.login('tok', { signal: ac.signal });
    ac.abort();
    await expect(p).rejects.toMatchObject({ code: ErrorCodes.GatewayConnectionAborted });
    expect(client.rest.token).toBeNull();
  });

  it('does not let a stale login failure tear down a newer connection', async () => {
    let rejectFirst!: (error: Error) => void;
    const firstWs = { destroy: vi.fn() };
    const secondWs = { destroy: vi.fn() };
    vi.spyOn(GatewayReady, 'connectClientGateway')
      .mockImplementationOnce(async (client) => {
        client._ws = firstWs as never;
        return new Promise<never>((_resolve, reject) => {
          rejectFirst = reject;
        });
      })
      .mockImplementationOnce(async (client) => {
        client._ws = secondWs as never;
        return secondWs as never;
      });

    const client = new Client();
    const firstLogin = client.login('first-token');
    await client.destroy();
    await expect(client.login('second-token')).resolves.toBe('second-token');

    rejectFirst(new Error('first connection failed'));
    await expect(firstLogin).rejects.toThrow('first connection failed');
    expect(client._ws).toBe(secondWs);
    expect(client.rest.token).toBe('second-token');
    expect(secondWs.destroy).not.toHaveBeenCalled();
  });

  it('does not let a stale login success replace a newer connection', async () => {
    let resolveFirst!: (ws: never) => void;
    const firstWs = { destroy: vi.fn() };
    const secondWs = { destroy: vi.fn() };
    vi.spyOn(GatewayReady, 'connectClientGateway')
      .mockImplementationOnce(async (client) => {
        client._ws = firstWs as never;
        return new Promise<never>((resolve) => {
          resolveFirst = resolve;
        });
      })
      .mockImplementationOnce(async (client) => {
        client._ws = secondWs as never;
        return secondWs as never;
      });

    const client = new Client();
    const firstLogin = client.login('first-token');
    await client.destroy();
    firstWs.destroy.mockClear();
    await expect(client.login('second-token')).resolves.toBe('second-token');

    resolveFirst(firstWs as never);
    await expect(firstLogin).rejects.toMatchObject({
      code: ErrorCodes.GatewayConnectionAborted,
    });
    expect(firstWs.destroy).toHaveBeenCalledOnce();
    expect(client._ws).toBe(secondWs);
    expect(client.rest.token).toBe('second-token');
  });
});
