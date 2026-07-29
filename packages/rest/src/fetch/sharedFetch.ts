/**
 * Process-wide keep-alive Agent (undici). Pools TCP only —
 * RateLimitManager still gates every request before fetch.
 *
 * Agent and fetch MUST come from the same undici package. Passing an npm
 * undici Agent into Node's built-in fetch (a different bundled undici)
 * fails with UND_ERR_INVALID_ARG: invalid onRequestStart method.
 *
 * Keep undici on v7 (>=7.28 for security patches) because undici v8
 * requires Node >=22.19, above the current engines.node >=22.13.
 */

import { Agent, fetch as undiciFetch } from 'undici';

let sharedAgent: Agent | null = null;

function getSharedAgent(): Agent {
  sharedAgent ??= new Agent({
    keepAliveTimeout: 30_000,
    keepAliveMaxTimeout: 60_000,
    connections: 32,
    pipelining: 1,
  });
  return sharedAgent;
}

type UndiciRequestInit = NonNullable<Parameters<typeof undiciFetch>[1]>;

export function sharedFetch(input: string | URL, init?: UndiciRequestInit): Promise<Response> {
  const undiciInit: UndiciRequestInit = {
    ...init,
    dispatcher: getSharedAgent(),
  };
  return undiciFetch(input, undiciInit) as unknown as Promise<Response>;
}

export async function closeSharedFetch(): Promise<void> {
  if (!sharedAgent) return;
  const agent = sharedAgent;
  sharedAgent = null;
  await agent.close();
}
