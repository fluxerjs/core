import { EventEmitter } from 'node:events';
import { Events } from '../Helpers/Events.js';
import type { ClientOptions } from '../Helpers/Options.js';
import { ErrorCodes } from '../LibErrors/ErrorCodes.js';
import { FluxerError } from '../LibErrors/FluxerError.js';
import { Client, type DiscoveryOrigin } from './Client.js';
import {
  type ClientClusterEventListener,
  type ClientClusterEventMap,
  ClientClusterEvents,
} from './ClientClusterEvents.js';

/** @beta Warning emitted once per process when a ClientCluster is constructed. */
export const BETA_CLIENT_CLUSTER_WARNING =
  'ClientCluster is a beta API. Runtime multi-instance supervision may change before stabilization. ' +
  'Each runtime requires its own instance-issued bot token; tokens are not portable across instances. ' +
  'Do not share structures or REST calls across clients.';

let betaWarningEmitted = false;

/** @beta Lifecycle status for a managed runtime. */
export type ClientRuntimeStatus =
  | 'connecting'
  | 'connected'
  | 'ready'
  | 'error'
  | 'disconnecting'
  | 'destroyed';

/**
 * @beta A managed Client inside a {@link ClientCluster}.
 * Does not store or expose the bot token.
 */
export interface ClientRuntime {
  readonly id: string;
  readonly client: Client;
  readonly status: ClientRuntimeStatus;
  /** Last client error, if any. Never includes the bot token. */
  readonly lastError?: Error;
}

/** @beta Options for constructing a ClientCluster. */
export interface ClientClusterOptions {
  /**
   * Called before `login` for every successfully constructed client.
   * Attach message/event handlers here so dynamically-added runtimes get the same wiring.
   */
  configure?: (runtime: ClientRuntime) => void | Promise<void>;
  /**
   * Suppress the process-level beta warning (tests / controlled deployments only).
   * Default: `false`.
   */
  suppressBetaWarning?: boolean;
}

/**
 * @beta Input for {@link ClientCluster.add}.
 * Exactly one of `discovery`, `clientOptions`, or `client` may be used to build the client
 * (or none — hosted defaults). `token` is always required and must be issued by that instance.
 */
export interface AddClientRuntimeOptions {
  /** Unique runtime id within this cluster (not a snowflake). */
  id: string;
  /** Bot token issued by the target instance. Required; never shared across runtimes. */
  token: string;
  /** Discover endpoints via unversioned `GET {origin}/.well-known/fluxer`. */
  discovery?: DiscoveryOrigin;
  /** Construct a new Client with these options (ignored when `client` or `discovery` is set). */
  clientOptions?: ClientOptions;
  /** Prebuilt, not-yet-logged-in Client. Must not already be connected. */
  client?: Client;
  /** Abort signal for this add operation (also aborted by `remove` / `destroy`). */
  signal?: AbortSignal;
}

/** @beta Options for {@link ClientCluster.restart}. Token must be re-supplied (never stored). */
export interface RestartClientRuntimeOptions {
  /** Bot token issued by the target instance. */
  token: string;
  signal?: AbortSignal;
}

type BuildKind = 'hosted' | 'discovery' | 'options' | 'prebuilt';

interface RuntimeBuildConfig {
  kind: BuildKind;
  discovery?: DiscoveryOrigin;
  clientOptions?: ClientOptions;
}

interface InternalRuntime {
  id: string;
  client: Client;
  status: ClientRuntimeStatus;
  lastError?: Error;
  abort: AbortController;
  readyHandler: () => void;
  errorHandler: (err: Error) => void;
  op: Promise<void>;
  build: RuntimeBuildConfig;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new FluxerError('Connection aborted', { code: ErrorCodes.GatewayConnectionAborted });
  }
}

function validateId(id: unknown): string {
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new FluxerError('Runtime id must be a non-empty string.', {
      code: ErrorCodes.InvalidRuntimeConfig,
    });
  }
  return id.trim();
}

function validateToken(token: unknown): string {
  if (typeof token !== 'string' || token.trim().length === 0) {
    throw new FluxerError('Each runtime requires its own non-empty bot token.', {
      code: ErrorCodes.InvalidRuntimeConfig,
    });
  }
  return token;
}

function captureBuildConfig(input: AddClientRuntimeOptions): RuntimeBuildConfig {
  if (input.client !== undefined) {
    return { kind: 'prebuilt' };
  }
  if (input.discovery !== undefined) {
    return { kind: 'discovery', discovery: input.discovery };
  }
  if (input.clientOptions !== undefined) {
    return { kind: 'options', clientOptions: input.clientOptions };
  }
  return { kind: 'hosted' };
}

/**
 * @beta In-memory supervisor for multiple independently-tokened Fluxer clients in one process.
 *
 * - One {@link Client} per runtime / instance
 * - Add and remove runtimes without restarting the process
 * - No required “main” instance
 * - Tokens are never stored on the runtime object
 *
 * **Beta:** API shape may change. Prefer attaching handlers via `configure`.
 */
export class ClientCluster extends EventEmitter {
  private readonly runtimes = new Map<string, InternalRuntime>();
  private readonly pending = new Map<string, Promise<void>>();
  private readonly configure?: ClientClusterOptions['configure'];
  private destroyed = false;

  constructor(options: ClientClusterOptions = {}) {
    super();
    this.setMaxListeners(0);
    this.configure = options.configure;
    if (!options.suppressBetaWarning && !betaWarningEmitted) {
      betaWarningEmitted = true;
      if (typeof process !== 'undefined' && typeof process.emitWarning === 'function') {
        process.emitWarning(BETA_CLIENT_CLUSTER_WARNING, {
          type: 'FluxerClientClusterBeta',
          code: 'FLUXER_CLIENT_CLUSTER_BETA',
        });
      } else {
        console.warn(`[FluxerClientClusterBeta] ${BETA_CLIENT_CLUSTER_WARNING}`);
      }
    }
  }

  override on<K extends keyof ClientClusterEventMap>(
    event: K,
    listener: ClientClusterEventListener<K>,
  ): this;
  override on(event: string | symbol, listener: (...args: unknown[]) => void): this;
  override on(event: string | symbol, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener);
  }

  override once<K extends keyof ClientClusterEventMap>(
    event: K,
    listener: ClientClusterEventListener<K>,
  ): this;
  override once(event: string | symbol, listener: (...args: unknown[]) => void): this;
  override once(event: string | symbol, listener: (...args: unknown[]) => void): this {
    return super.once(event, listener);
  }

  override off<K extends keyof ClientClusterEventMap>(
    event: K,
    listener: ClientClusterEventListener<K>,
  ): this;
  override off(event: string | symbol, listener: (...args: unknown[]) => void): this;
  override off(event: string | symbol, listener: (...args: unknown[]) => void): this {
    return super.off(event, listener);
  }

  override emit<K extends keyof ClientClusterEventMap>(
    event: K,
    ...args: ClientClusterEventMap[K]
  ): boolean;
  override emit(event: string | symbol, ...args: unknown[]): boolean;
  override emit(event: string | symbol, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }

  /** Number of managed runtimes (including those still connecting). */
  get size(): number {
    return this.runtimes.size;
  }

  has(id: string): boolean {
    return this.runtimes.has(id);
  }

  get(id: string): ClientRuntime | undefined {
    const rt = this.runtimes.get(id);
    return rt ? this.toPublic(rt) : undefined;
  }

  /** Snapshot of current runtimes. */
  values(): ClientRuntime[] {
    return [...this.runtimes.values()].map((rt) => this.toPublic(rt));
  }

  /**
   * @beta Allocation-free iterator over current runtimes.
   * Prefer this over {@link values} when you only need to iterate once.
   */
  *runtimeValues(): IterableIterator<ClientRuntime> {
    for (const rt of this.runtimes.values()) {
      yield this.toPublic(rt);
    }
  }

  /**
   * @beta Add and connect a runtime. Requires a token issued by that instance.
   * Safe to call while other runtimes are already connected.
   */
  async add(input: AddClientRuntimeOptions): Promise<ClientRuntime> {
    if (this.destroyed) {
      throw new FluxerError('ClientCluster has been destroyed.', {
        code: ErrorCodes.ClusterDestroyed,
      });
    }
    const id = validateId(input.id);
    const token = validateToken(input.token);

    if (this.runtimes.has(id) || this.pending.has(id)) {
      throw new FluxerError(`Runtime id "${id}" is already in use.`, {
        code: ErrorCodes.DuplicateRuntimeId,
      });
    }

    const hasDiscovery = input.discovery !== undefined;
    const hasClient = input.client !== undefined;
    const hasOptions = input.clientOptions !== undefined;
    if ([hasDiscovery, hasClient, hasOptions].filter(Boolean).length > 1) {
      throw new FluxerError(
        'Pass only one of discovery, clientOptions, or client when adding a runtime.',
        { code: ErrorCodes.InvalidRuntimeConfig },
      );
    }

    if (input.client?._ws) {
      throw new FluxerError('Prebuilt client is already logged in. Pass an unconnected Client.', {
        code: ErrorCodes.RuntimeAlreadyLoggedIn,
      });
    }

    const abort = new AbortController();
    const onExternalAbort = (): void => {
      abort.abort();
    };
    input.signal?.addEventListener('abort', onExternalAbort, { once: true });
    if (input.signal?.aborted) abort.abort();

    const op = this.runAdd(id, token, input, abort);
    this.pending.set(id, op);
    try {
      await op;
    } finally {
      this.pending.delete(id);
      input.signal?.removeEventListener('abort', onExternalAbort);
    }

    const rt = this.runtimes.get(id);
    if (!rt) {
      throw new FluxerError(`Runtime "${id}" failed to start.`, {
        code: ErrorCodes.RuntimeNotFound,
      });
    }
    return this.toPublic(rt);
  }

  /**
   * @beta Add multiple runtimes concurrently. Uses `Promise.allSettled` so one failure
   * does not abort the rest.
   */
  async addAll(
    inputs: readonly AddClientRuntimeOptions[],
  ): Promise<PromiseSettledResult<ClientRuntime>[]> {
    return Promise.allSettled(inputs.map((input) => this.add(input)));
  }

  /**
   * @beta Rebuild a runtime with a freshly supplied token (never stored on the cluster).
   * Removes the existing runtime, then re-adds it with the same non-secret build config.
   * Prebuilt-client runtimes cannot be restarted (`RuntimeConflict`).
   */
  async restart(id: string, opts: RestartClientRuntimeOptions): Promise<ClientRuntime> {
    if (this.destroyed) {
      throw new FluxerError('ClientCluster has been destroyed.', {
        code: ErrorCodes.ClusterDestroyed,
      });
    }
    const key = validateId(id);
    const token = validateToken(opts.token);
    const existing = this.runtimes.get(key);
    if (!existing) {
      throw new FluxerError(`Runtime "${key}" was not found.`, {
        code: ErrorCodes.RuntimeNotFound,
      });
    }
    if (existing.build.kind === 'prebuilt') {
      throw new FluxerError(
        `Runtime "${key}" was added with a prebuilt Client and cannot be restarted. Remove it and add a new client.`,
        { code: ErrorCodes.RuntimeConflict },
      );
    }

    const build = existing.build;
    await this.remove(key);

    const addInput: AddClientRuntimeOptions = {
      id: key,
      token,
      signal: opts.signal,
    };
    if (build.kind === 'discovery') {
      addInput.discovery = build.discovery;
    } else if (build.kind === 'options') {
      addInput.clientOptions = build.clientOptions;
    }

    return this.add(addInput);
  }

  /**
   * @beta Disconnect and remove a runtime. Idempotent — returns `false` if unknown.
   * Does not affect other runtimes.
   */
  async remove(id: string): Promise<boolean> {
    const key = typeof id === 'string' ? id.trim() : '';
    if (!key) return false;

    const pending = this.pending.get(key);
    const rt = this.runtimes.get(key);
    if (!rt && !pending) return false;

    if (rt) {
      rt.abort.abort();
      rt.status = 'disconnecting';
    }

    if (pending) {
      try {
        await pending;
      } catch {
        // add failed or was aborted — cleanup handled in runAdd
      }
    }

    const current = this.runtimes.get(key);
    if (!current) return true;

    current.status = 'disconnecting';
    current.abort.abort();
    this.detachHandlers(current);
    try {
      await current.client.destroy();
    } finally {
      current.status = 'destroyed';
      this.runtimes.delete(key);
      this.emit(ClientClusterEvents.RuntimeRemoved, this.toPublic(current));
    }
    return true;
  }

  /**
   * @beta Destroy every runtime and prevent further adds. Idempotent.
   * Also clears cluster lifecycle listeners.
   */
  async destroy(): Promise<void> {
    this.destroyed = true;
    const ids = new Set([...this.runtimes.keys(), ...this.pending.keys()]);
    await Promise.allSettled([...ids].map((id) => this.remove(id)));
    this.removeAllListeners();
  }

  private toPublic(rt: InternalRuntime): ClientRuntime {
    return {
      id: rt.id,
      client: rt.client,
      get status(): ClientRuntimeStatus {
        return rt.status;
      },
      get lastError(): Error | undefined {
        return rt.lastError;
      },
    };
  }

  private detachHandlers(rt: InternalRuntime): void {
    rt.client.off(Events.Ready, rt.readyHandler);
    rt.client.off(Events.Error, rt.errorHandler);
  }

  private async runAdd(
    id: string,
    token: string,
    input: AddClientRuntimeOptions,
    abort: AbortController,
  ): Promise<void> {
    let client: Client | null = null;
    let readyHandler: (() => void) | null = null;
    let errorHandler: ((err: Error) => void) | null = null;
    const build = captureBuildConfig(input);

    try {
      throwIfAborted(abort.signal);

      if (input.client) {
        client = input.client;
      } else if (input.discovery !== undefined) {
        client = await Client.fromDiscovery(input.discovery, {}, { signal: abort.signal });
      } else {
        client = new Client(input.clientOptions ?? {});
      }

      throwIfAborted(abort.signal);

      const internal: InternalRuntime = {
        id,
        client,
        status: 'connecting',
        abort,
        readyHandler: () => undefined,
        errorHandler: () => undefined,
        op: Promise.resolve(),
        build,
      };

      readyHandler = (): void => {
        const rt = this.runtimes.get(id);
        if (!rt || rt.client !== client) return;
        rt.status = 'ready';
        rt.lastError = undefined;
        this.emit(ClientClusterEvents.RuntimeReady, this.toPublic(rt));
      };
      errorHandler = (err: Error): void => {
        const rt = this.runtimes.get(id);
        if (!rt || rt.client !== client) return;
        rt.status = 'error';
        rt.lastError = err;
        this.emit(ClientClusterEvents.RuntimeError, this.toPublic(rt), err);
      };
      internal.readyHandler = readyHandler;
      internal.errorHandler = errorHandler;

      client.on(Events.Ready, readyHandler);
      client.on(Events.Error, errorHandler);

      // Reserve before configure/login so concurrent add(same id) fails.
      this.runtimes.set(id, internal);
      this.emit(ClientClusterEvents.RuntimeAdded, this.toPublic(internal));

      if (this.configure) {
        await this.configure(this.toPublic(internal));
      }

      throwIfAborted(abort.signal);
      await client.login(token, { signal: abort.signal });
      throwIfAborted(abort.signal);

      const rt = this.runtimes.get(id);
      if (rt && rt.client === client) {
        rt.status = client.isReady() ? 'ready' : 'connected';
        rt.lastError = undefined;
      }
    } catch (err) {
      if (client && readyHandler && errorHandler) {
        client.off(Events.Ready, readyHandler);
        client.off(Events.Error, errorHandler);
      }
      const reserved = this.runtimes.get(id);
      if (reserved?.client === client) {
        this.runtimes.delete(id);
      }
      try {
        await client?.destroy();
      } catch {
        // ignore destroy errors during rollback
      }
      throw err;
    }
  }
}

/** @internal Test helper — reset process-level beta warning latch. */
export function resetClientClusterBetaWarningForTests(): void {
  betaWarningEmitted = false;
}
