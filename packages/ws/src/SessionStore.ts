/**
 * Persistable gateway session for RESUME after a process restart.
 * Fluxer's resume window is 60s — entries past that must be discarded.
 */

/** Default resume TTL matching the Fluxer gateway (`resume_timeout`). */
export const DEFAULT_RESUME_TTL_MS = 60_000;

export interface SessionInfo {
  sessionId: string;
  sequence: number;
  /** Epoch ms when the session was last written. Used to honour the resume TTL. */
  updatedAt: number;
  /** Resume gateway URL when the READY payload provided one; otherwise omit. */
  resumeUrl?: string;
}

export interface ISessionStore {
  retrieveSessionInfo(shardId: number): Promise<SessionInfo | null> | SessionInfo | null;
  updateSessionInfo(shardId: number, info: SessionInfo | null): Promise<void> | void;
}

/** In-memory session store with TTL discard. Suitable for single-process bots. */
export class MemorySessionStore implements ISessionStore {
  private readonly sessions = new Map<number, SessionInfo>();
  private readonly ttlMs: number;

  constructor(options?: { ttlMs?: number }) {
    this.ttlMs = options?.ttlMs ?? DEFAULT_RESUME_TTL_MS;
  }

  retrieveSessionInfo(shardId: number): SessionInfo | null {
    const info = this.sessions.get(shardId);
    if (!info) return null;
    if (Date.now() - info.updatedAt > this.ttlMs) {
      this.sessions.delete(shardId);
      return null;
    }
    return info;
  }

  updateSessionInfo(shardId: number, info: SessionInfo | null): void {
    if (info === null) {
      this.sessions.delete(shardId);
      return;
    }
    this.sessions.set(shardId, { ...info, updatedAt: info.updatedAt || Date.now() });
  }

  clear(): void {
    this.sessions.clear();
  }
}

/** True when stored session info is still within the resume window. */
export function isSessionInfoFresh(
  info: SessionInfo,
  ttlMs: number = DEFAULT_RESUME_TTL_MS,
  now: number = Date.now(),
): boolean {
  return now - info.updatedAt <= ttlMs;
}
