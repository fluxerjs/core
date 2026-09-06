import { type IIdentifyThrottler, shardIdForGuild } from '@fluxerjs/ws';
import { createEnvelope, type IpcEnvelope, IpcOp, isIpcEnvelope, nextNonce } from './Ipc.js';
import { ParentIdentifyThrottler } from './ParentIdentifyThrottler.js';

export interface ShardClientUtilOptions {
  /**
   * The Client instance in this child process.
   * Typed loosely so @fluxerjs/core remains a peer dependency.
   */
  client: {
    options: Record<string, unknown>;
    login: (token: string, options?: { signal?: AbortSignal }) => Promise<string>;
    on: (event: string, listener: (...args: unknown[]) => void) => unknown;
    emit: (event: string, ...args: unknown[]) => boolean;
    [key: string]: unknown;
  };
}

/**
 * Mounted as `client.shard` inside a ShardingManager child process.
 */
export class ShardClientUtil {
  readonly ids: number[];
  readonly count: number;
  private readonly client: ShardClientUtilOptions['client'];
  private readonly pending = new Map<
    string,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();

  constructor(client: ShardClientUtilOptions['client']) {
    this.client = client;
    this.ids = parseShardIds(process.env.FLUXER_SHARD_IDS);
    this.count = Number(process.env.FLUXER_SHARD_COUNT ?? '1') || 1;

    if (typeof process.send === 'function') {
      process.on('message', (msg) => this.onParentMessage(msg));
    }
  }

  /** Process id within the manager (first shard id of this slice). */
  get id(): number {
    return Number(process.env.FLUXER_SHARD_PROCESS_ID ?? this.ids[0] ?? 0);
  }

  shardIdForGuildId(guildId: string): number {
    return shardIdForGuild(guildId, this.count);
  }

  /**
   * Evaluate `fn` on every shard process (including this one via parent fan-out).
   * Captured closure variables are NOT available — pass them via `context`.
   */
  async broadcastEval<T>(
    fn: (client: ShardClientUtilOptions['client'], context?: unknown) => T | Promise<T>,
    options?: { context?: unknown },
  ): Promise<T[]> {
    // Child asks parent to fan out; parent returns aggregated results.
    return (await this.sendAndWait(IpcOp.Eval, {
      script: `(${fn.toString()})`,
      context: options?.context,
      broadcast: true,
    })) as T[];
  }

  async fetchClientValues(prop: string): Promise<unknown[]> {
    return (await this.sendAndWait(IpcOp.FetchProp, { prop, broadcast: true })) as unknown[];
  }

  async respawn(options?: { delay?: number }): Promise<void> {
    await this.sendAndWait(IpcOp.Respawn, options ?? {});
  }

  send(data: unknown): void {
    process.send?.(createEnvelope(IpcOp.Custom, data));
  }

  /** Signal the parent that this child is ready (call after client.login). */
  notifyReady(): void {
    process.send?.(createEnvelope(IpcOp.Ready, { ids: this.ids }));
  }

  /**
   * Request a spawn/identify token from the parent manager before connecting shards.
   * Required so children share the host IP identify budget.
   */
  async requestSpawnToken(shardId: number): Promise<void> {
    await this.sendAndWait(IpcOp.SpawnTokenRequest, { shardId });
  }

  private onParentMessage(msg: unknown): void {
    if (!isIpcEnvelope(msg)) return;
    switch (msg.op) {
      case IpcOp.Eval:
        void this.handleEval(msg);
        break;
      case IpcOp.FetchProp:
        void this.handleFetchProp(msg);
        break;
      case IpcOp.Result:
      case IpcOp.Error:
      case IpcOp.SpawnTokenGrant:
        if (msg.nonce) {
          const pending = this.pending.get(msg.nonce);
          if (pending) {
            this.pending.delete(msg.nonce);
            if (msg.error) pending.reject(new Error(msg.error));
            else pending.resolve(msg.data);
          }
        }
        break;
      default:
        break;
    }
  }

  private async handleEval(msg: IpcEnvelope): Promise<void> {
    const data = msg.data as { script?: string; context?: unknown } | undefined;
    try {
      const script = data?.script;
      if (typeof script !== 'string') throw new Error('Missing eval script');
      // Function form: (client) => ...  OR  function(client) ...
      // eslint-disable-next-line no-new-func
      const fn = new Function(`return (${script})`)() as (
        client: ShardClientUtilOptions['client'],
        context?: unknown,
      ) => unknown;
      const result = await fn(this.client, data?.context);
      process.send?.(createEnvelope(IpcOp.Result, result, msg.nonce));
    } catch (err) {
      process.send?.(
        createEnvelope(
          IpcOp.Error,
          undefined,
          msg.nonce,
          err instanceof Error ? err.message : String(err),
        ),
      );
    }
  }

  private async handleFetchProp(msg: IpcEnvelope): Promise<void> {
    const prop = (msg.data as { prop?: string } | undefined)?.prop;
    try {
      if (typeof prop !== 'string') throw new Error('Missing property path');
      const value = prop.split('.').reduce<unknown>((acc, key) => {
        if (acc == null) return undefined;
        return (acc as Record<string, unknown>)[key];
      }, this.client);
      process.send?.(createEnvelope(IpcOp.Result, value, msg.nonce));
    } catch (err) {
      process.send?.(
        createEnvelope(
          IpcOp.Error,
          undefined,
          msg.nonce,
          err instanceof Error ? err.message : String(err),
        ),
      );
    }
  }

  private sendAndWait(op: IpcOp, data: unknown): Promise<unknown> {
    const nonce = nextNonce();
    return new Promise((resolve, reject) => {
      if (typeof process.send !== 'function') {
        reject(new Error('Not running under ShardingManager (process.send missing)'));
        return;
      }
      this.pending.set(nonce, { resolve, reject });
      process.send(createEnvelope(op, data, nonce));
    });
  }
}

function parseShardIds(raw: string | undefined): number[] {
  if (!raw) return [0];
  return raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0);
}

/**
 * Apply shard env from ShardingManager onto Client options and attach `client.shard`.
 * Call before `client.login()`. Also installs a {@link ParentIdentifyThrottler} so
 * IDENTIFYs are budgeted by the parent manager.
 */
export function attachShardClientUtil<T extends ShardClientUtilOptions['client']>(
  client: T,
): ShardClientUtil {
  const util = new ShardClientUtil(client);
  (client as { shard?: ShardClientUtil }).shard = util;
  client.options.shardIds = util.ids;
  client.options.shardCount = util.count;
  // Lazy import avoided — set identify throttler via options if client supports it.
  (client.options as { identifyThrottler?: IIdentifyThrottler }).identifyThrottler =
    new ParentIdentifyThrottler(util);
  return util;
}
