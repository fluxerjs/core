/**
 * IPC envelope shared between ShardingManager (parent) and shard child processes.
 */

export const IPC_MARKER = '_fluxer' as const;

export enum IpcOp {
  Eval = 1,
  Result = 2,
  FetchProp = 3,
  Respawn = 4,
  Ready = 5,
  Death = 6,
  Custom = 7,
  SpawnTokenRequest = 8,
  SpawnTokenGrant = 9,
  ShardIds = 10,
  Error = 11,
}

export interface IpcEnvelope<T = unknown> {
  readonly [IPC_MARKER]: true;
  op: IpcOp;
  nonce?: string;
  data?: T;
  error?: string;
}

export function isIpcEnvelope(value: unknown): value is IpcEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { [IPC_MARKER]?: unknown })[IPC_MARKER] === true &&
    typeof (value as { op?: unknown }).op === 'number'
  );
}

export function createEnvelope<T>(
  op: IpcOp,
  data?: T,
  nonce?: string,
  error?: string,
): IpcEnvelope<T> {
  const env: IpcEnvelope<T> = { [IPC_MARKER]: true, op };
  if (data !== undefined) env.data = data;
  if (nonce !== undefined) env.nonce = nonce;
  if (error !== undefined) env.error = error;
  return env;
}

let nonceCounter = 0;
export function nextNonce(): string {
  nonceCounter = (nonceCounter + 1) % 1_000_000_000;
  return `${Date.now().toString(36)}-${nonceCounter.toString(36)}`;
}
