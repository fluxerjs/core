import { describe, expect, it } from 'vitest';
import { createEnvelope, IPC_MARKER, IpcOp, isIpcEnvelope, nextNonce } from './Ipc.js';

describe('IPC', () => {
  it('creates marked envelopes', () => {
    const env = createEnvelope(IpcOp.Ready, { ids: [0, 1] }, 'n1');
    expect(env[IPC_MARKER]).toBe(true);
    expect(env.op).toBe(IpcOp.Ready);
    expect(env.nonce).toBe('n1');
    expect(isIpcEnvelope(env)).toBe(true);
    expect(isIpcEnvelope({ op: 1 })).toBe(false);
  });

  it('generates unique nonces', () => {
    const a = nextNonce();
    const b = nextNonce();
    expect(a).not.toBe(b);
  });
});
