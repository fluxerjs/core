import { type ChildProcess, fork } from 'node:child_process';
import { EventEmitter } from 'node:events';
import type { IIdentifyThrottler } from '@fluxerjs/ws';
import { createEnvelope, type IpcEnvelope, IpcOp, isIpcEnvelope, nextNonce } from './Ipc.js';

export interface ShardProcessOptions {
  id: number;
  file: string;
  args?: string[];
  execArgv?: string[];
  env?: NodeJS.ProcessEnv;
  shardIds: number[];
  totalShards: number;
  token: string;
  respawn: boolean;
  spawnTimeoutMs: number;
  identifyThrottler: IIdentifyThrottler;
}

/**
 * One child process owning a contiguous slice of gateway shards.
 */
export class ShardProcess extends EventEmitter {
  readonly id: number;
  private child: ChildProcess | null = null;
  private readonly options: ShardProcessOptions;
  private readonly pending = new Map<
    string,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  private ready = false;

  constructor(options: ShardProcessOptions) {
    super();
    this.id = options.id;
    this.options = options;
  }

  get shardIds(): readonly number[] {
    return this.options.shardIds;
  }

  get readyAt(): boolean {
    return this.ready;
  }

  async spawn(): Promise<void> {
    if (this.child) return;

    await this.options.identifyThrottler.waitForIdentify(
      this.options.shardIds[0] ?? this.id,
      async () => undefined,
    );

    const forked: ChildProcess = fork(this.options.file, this.options.args ?? [], {
      env: {
        ...process.env,
        ...this.options.env,
        FLUXER_SHARD_IDS: this.options.shardIds.join(','),
        FLUXER_SHARD_COUNT: String(this.options.totalShards),
        FLUXER_SHARD_PROCESS_ID: String(this.id),
        FLUXER_TOKEN: this.options.token,
      },
      execArgv: this.options.execArgv,
      serialization: 'advanced',
    });
    this.child = forked;

    forked.on('message', (msg: unknown) => this.onMessage(msg));
    forked.on('exit', (code: number | null, signal: NodeJS.Signals | null) =>
      this.onExit(code, signal),
    );
    forked.on('error', (err: Error) => this.emit('error', err));

    await this.waitForReady(this.options.spawnTimeoutMs);
  }

  async eval<T>(script: string, context?: unknown): Promise<T> {
    return (await this.sendAndWait(IpcOp.Eval, { script, context })) as T;
  }

  async fetchClientValue(prop: string): Promise<unknown> {
    return this.sendAndWait(IpcOp.FetchProp, { prop });
  }

  async respawn(): Promise<void> {
    await this.kill();
    this.ready = false;
    await this.spawn();
  }

  async kill(): Promise<void> {
    const child = this.child;
    this.child = null;
    this.ready = false;
    if (!child || child.killed) return;
    await new Promise<void>((resolve) => {
      child.once('exit', () => resolve());
      child.kill();
      setTimeout(() => {
        if (!child.killed) child.kill('SIGKILL');
        resolve();
      }, 5_000).unref?.();
    });
  }

  send(op: IpcOp, data?: unknown, nonce?: string, error?: string): void {
    this.child?.send(createEnvelope(op, data, nonce, error));
  }

  private onMessage(msg: unknown): void {
    if (!isIpcEnvelope(msg)) {
      this.emit('message', msg);
      return;
    }
    switch (msg.op) {
      case IpcOp.Ready:
        this.ready = true;
        this.emit('ready');
        break;
      case IpcOp.Death:
        this.emit('death', msg.data);
        break;
      case IpcOp.Result:
      case IpcOp.Error:
        if (msg.nonce) {
          const pending = this.pending.get(msg.nonce);
          if (pending) {
            this.pending.delete(msg.nonce);
            if (msg.error) pending.reject(new Error(msg.error));
            else pending.resolve(msg.data);
          }
        }
        break;
      case IpcOp.SpawnTokenRequest:
        void this.grantSpawnToken(msg);
        break;
      case IpcOp.Eval:
      case IpcOp.FetchProp:
      case IpcOp.Respawn:
        this.emit('ipc', msg);
        break;
      case IpcOp.Custom:
        this.emit('message', msg.data);
        break;
      default:
        break;
    }
  }

  private async grantSpawnToken(msg: IpcEnvelope): Promise<void> {
    const shardId =
      typeof msg.data === 'object' && msg.data && 'shardId' in msg.data
        ? Number((msg.data as { shardId: unknown }).shardId)
        : (this.options.shardIds[0] ?? this.id);
    try {
      await this.options.identifyThrottler.waitForIdentify(shardId, async () => undefined);
      this.send(IpcOp.SpawnTokenGrant, { ok: true }, msg.nonce);
    } catch (err) {
      this.send(
        IpcOp.SpawnTokenGrant,
        { ok: false },
        msg.nonce,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  private onExit(code: number | null, signal: NodeJS.Signals | null): void {
    this.child = null;
    this.ready = false;
    for (const [, pending] of this.pending) {
      pending.reject(new Error(`Shard process ${this.id} exited`));
    }
    this.pending.clear();
    this.emit('death', { code, signal });
  }

  private waitForReady(timeoutMs: number): Promise<void> {
    if (this.ready) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Shard process ${this.id} timed out waiting for ready`));
      }, timeoutMs);
      const onReady = (): void => {
        cleanup();
        resolve();
      };
      const onDeath = (): void => {
        cleanup();
        reject(new Error(`Shard process ${this.id} died before ready`));
      };
      const cleanup = (): void => {
        clearTimeout(timer);
        this.off('ready', onReady);
        this.off('death', onDeath);
      };
      this.on('ready', onReady);
      this.on('death', onDeath);
    });
  }

  private sendAndWait(op: IpcOp, data: unknown): Promise<unknown> {
    const nonce = nextNonce();
    return new Promise((resolve, reject) => {
      if (!this.child) {
        reject(new Error(`Shard process ${this.id} is not running`));
        return;
      }
      this.pending.set(nonce, { resolve, reject });
      this.send(op, data, nonce);
    });
  }
}
