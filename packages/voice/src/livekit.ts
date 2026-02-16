/**
 * Helpers for LiveKit voice endpoints (e.g. Fluxer with access_token in URL).
 */

/**
 * True when we should use LiveKit: full URL with access_token, or host + token (Fluxer sends host only to bots).
 */
export function isLiveKitEndpoint(
  endpoint: string | null | undefined,
  token?: string | null,
): boolean {
  if (!endpoint || typeof endpoint !== 'string') return false;
  const s = endpoint.trim();
  if (s.includes('access_token=') || (s.includes('/rtc') && s.includes('?'))) return true;
  // Gateway may send only host (e.g. ferret.iad.fluxer.media) + token
  if (token && !s.includes('?')) return true;
  return false;
}

/**
 * Build base WebSocket URL for @livekit/rtc-node SDK. The SDK adds /rtc internally.
 * Use this for room.connect(url, token) - pass token separately.
 * Removes trailing slashes and /rtc path to avoid 404 (SDK adds /rtc itself).
 */
export function buildLiveKitUrlForRtcSdk(endpoint: string): string {
  const base =
    endpoint
      .replace(/^(wss|ws|https?):\/\//i, '')
      .replace(/^\/+/, '')
      .split('/')[0] ?? endpoint;
  const scheme = /^wss?:\/\//i.test(endpoint) ? (endpoint.startsWith('wss') ? 'wss' : 'ws') : 'wss';
  return `${scheme}://${base.replace(/\/+$/, '')}`;
}
