import { EventEmitter } from 'node:events';
import {
  DEFAULT_GUILDS_PER_SHARD,
  type IIdentifyThrottler,
  MAX_SHARD_COUNT,
  recommendedShardCount,
  SimpleIdentifyThrottler,
} from '@fluxerjs/ws';
import { IpcOp } from './Ipc.js';
import { ShardProcess } from './ShardProcess.js';

/** @beta Warning for consumers adopting process/cluster sharding. */
export const BETA_SHARDING_WARNING =
  '@fluxerjs/sharding is a beta API. Process/cluster supervision and IPC shapes may change before stabilization. ' +
  'DMs and guild-less events only reach shard 0. Prefer explicit totalShards until Fluxer /gateway/bot reports real counts.';

export type ShardingMode = 'process';

export interface ShardingManagerOptions {
  /** Absolute or relative path to the bot entry file (forked per process). */
  file: string;
  /** Bot token — forwarded to children via env (never logged). */
  token: string;
  /**
   * Total shard count, or `'auto'` (requires `fetchGuildCount`).
   * Prefer an explicit number when you know your scale.
   * Alias: {@link shardCount}.
   * @default 1
   */
  totalShards?: number | 'auto';
  /**
   * Alias of {@link totalShards} (matches Client / ws vocabulary).
   */
  shardCount?: number | 'auto';
  /** Explicit list of shard ids to spawn (defaults to `0..totalShards-1`). Alias: {@link shardIds}. */
  shardList?: number[];
  /** Alias of {@link shardList}. */
  shardIds?: number[];
  /** How many gateway shards each child process owns. @default 1 */
  shardsPerProcess?: number;
  /** Respawning dead children. @default true */
  respawn?: boolean;
  /** Timeout waiting for a child Ready IPC. @default 30_000 */
  spawnTimeout?: number;
  /** Delay between spawning successive child processes. @default 5_000 */
  spawnDelay?: number;
  /** Args forwarded to `child_process.fork`. */
  shardArgs?: string[];
  execArgv?: string[];
  /**
   * Provide when `totalShards: 'auto'`. Should return the bot's guild count.
   * Fluxer's `/gateway/bot` stubs `shards: 1`, so this is required for auto.
   */
  fetchGuildCount?: () => Promise<number>;
  /** Guilds per shard for auto mode. @default 1500 */
  guildsPerShard?: number;
  /** Shared identify budget for all children on this host. */
  identifyThrottler?: IIdentifyThrottler;
}

/**
 * @beta Process-level sharding supervisor.
 *
 * Forks one child per shard-slice. The manager owns the per-IP IDENTIFY budget
 * so children cannot collectively exceed Fluxer's 300 IDENTIFYs / 60s limit.
 *
 * Non-zero shards drop guild-less events — DMs only reach shard 0.
 * Pass an explicit `totalShards` number when you know your scale.
 */
export class ShardingManager extends EventEmitter {
  readonly file: string;
  readonly token: string;
  readonly shards = new Map<number, ShardProcess>();
  private totalShards = 1;
  private readonly options: ShardingManagerOptions;
  private readonly identifyThrottler: IIdentifyThrottler;
  private spawning = false;

  constructor(file: string, options: Omit<ShardingManagerOptions, 'file'> & { token: string }) {
    super();
    this.file = file;
    this.token = options.token;
    this.options = { file, ...options };
    this.identifyThrottler = options.identifyThrottler ?? new SimpleIdentifyThrottler();
    console.warn(BETA_SHARDING_WARNING);
  }

  get shardCount(): number {
    return this.totalShards;
  }

  /**
   * Spawn all shard processes.
   * @param amount Overrides `totalShards` for this spawn.
   */
  async spawn(amount?: number | 'auto'): Promise<Map<number, ShardProcess>> {
    if (this.spawning) throw new Error('ShardingManager is already spawning');
    this.spawning = true;
    try {
      this.totalShards = await this.resolveTotalShards(
        amount ?? this.options.totalShards ?? this.options.shardCount ?? 1,
      );
      const shardList =
        this.options.shardList ??
        this.options.shardIds ??
        [...Array(this.totalShards).keys()].filter((id) => id < this.totalShards);

      const perProcess = Math.max(1, this.options.shardsPerProcess ?? 1);
      const groups = chunk(shardList, perProcess);
      const delay = this.options.spawnDelay ?? 5_000;
      const timeout = this.options.spawnTimeout ?? 30_000;
      const respawn = this.options.respawn !== false;

      for (let i = 0; i < groups.length; i++) {
        const shardIds = groups[i] as number[];
        const processId = shardIds[0] as number;
        const shard = new ShardProcess({
          id: processId,
          file: this.file,
          args: this.options.shardArgs,
          execArgv: this.options.execArgv,
          shardIds,
          totalShards: this.totalShards,
          token: this.token,
          respawn,
          spawnTimeoutMs: timeout,
          identifyThrottler: this.identifyThrottler,
        });

        shard.on('ready', () => this.emit('shardReady', shard));
        shard.on('death', (info) => {
          this.emit('shardDeath', shard, info);
          if (respawn) {
            void this.respawnShard(processId).catch((err) => this.emit('error', err));
          }
        });
        shard.on('error', (err) => this.emit('error', err));
        shard.on('message', (msg) => this.emit('message', shard, msg));
        shard.on('ipc', (msg) => {
          void this.handleChildIpc(shard, msg).catch((err) => this.emit('error', err));
        });

        this.shards.set(processId, shard);
        this.emit('shardCreate', shard);
        await shard.spawn();
        if (i < groups.length - 1 && delay > 0) {
          await sleep(delay);
        }
      }

      return this.shards;
    } finally {
      this.spawning = false;
    }
  }

  async broadcastEval<T>(
    fn: string | ((client: unknown, context?: unknown) => T | Promise<T>),
    options?: { context?: unknown; shard?: number },
  ): Promise<T[]> {
    const script = typeof fn === 'string' ? fn : `(${fn.toString()})`;
    const targets = this.targetShards(options?.shard);
    const results = await Promise.all(
      targets.map((shard) => shard.eval<T>(script, options?.context)),
    );
    return results;
  }

  async fetchClientValues(prop: string, shard?: number): Promise<unknown[]> {
    const targets = this.targetShards(shard);
    return Promise.all(targets.map((s) => s.fetchClientValue(prop)));
  }

  async respawnAll(options?: { shardDelay?: number }): Promise<void> {
    const delay = options?.shardDelay ?? 5_000;
    const entries = [...this.shards.entries()];
    for (let i = 0; i < entries.length; i++) {
      const [, shard] = entries[i] as [number, ShardProcess];
      await shard.respawn();
      if (i < entries.length - 1 && delay > 0) await sleep(delay);
    }
  }

  async respawnShard(id: number): Promise<void> {
    const shard = this.shards.get(id);
    if (!shard) throw new Error(`Unknown shard process ${id}`);
    await shard.respawn();
  }

  async destroy(): Promise<void> {
    this.identifyThrottler.destroy?.();
    await Promise.allSettled([...this.shards.values()].map((s) => s.kill()));
    this.shards.clear();
  }

  private targetShards(shard?: number): ShardProcess[] {
    if (shard === undefined) return [...this.shards.values()];
    const found = this.shards.get(shard);
    if (!found) throw new Error(`Unknown shard process ${shard}`);
    return [found];
  }

  private async handleChildIpc(
    source: ShardProcess,
    msg: { op: number; nonce?: string; data?: unknown },
  ): Promise<void> {
    try {
      if (msg.op === IpcOp.Eval) {
        const data = msg.data as { script?: string; context?: unknown; broadcast?: boolean };
        if (data?.broadcast) {
          const results = await this.broadcastEval(data.script ?? '', {
            context: data.context,
          });
          source.send(IpcOp.Result, results, msg.nonce);
        } else {
          const result = await source.eval(data.script ?? '', data?.context);
          source.send(IpcOp.Result, result, msg.nonce);
        }
        return;
      }
      if (msg.op === IpcOp.FetchProp) {
        const data = msg.data as { prop?: string; broadcast?: boolean };
        if (data?.broadcast) {
          const results = await this.fetchClientValues(data.prop ?? '');
          source.send(IpcOp.Result, results, msg.nonce);
        } else {
          const result = await source.fetchClientValue(data.prop ?? '');
          source.send(IpcOp.Result, result, msg.nonce);
        }
        return;
      }
      if (msg.op === IpcOp.Respawn) {
        await this.respawnAll(msg.data as { shardDelay?: number } | undefined);
        source.send(IpcOp.Result, true, msg.nonce);
      }
    } catch (err) {
      source.send(
        IpcOp.Error,
        undefined,
        msg.nonce,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  private async resolveTotalShards(amount: number | 'auto'): Promise<number> {
    if (typeof amount === 'number') {
      if (!Number.isInteger(amount) || amount < 1 || amount > MAX_SHARD_COUNT) {
        throw new RangeError(`totalShards must be in [1, ${MAX_SHARD_COUNT}]`);
      }
      return amount;
    }
    if (!this.options.fetchGuildCount) {
      throw new Error(
        "totalShards: 'auto' requires fetchGuildCount (Fluxer /gateway/bot always reports shards: 1)",
      );
    }
    const guilds = await this.options.fetchGuildCount();
    return recommendedShardCount(guilds, this.options.guildsPerShard ?? DEFAULT_GUILDS_PER_SHARD);
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
