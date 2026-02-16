/**
 * Emit a one-time deprecation warning for a symbol.
 * Warnings are suppressed when FLUXER_SUPPRESS_DEPRECATION=1.
 *
 * @param symbol - Unique key for this deprecation (e.g. 'ChannelManager.fetchMessage')
 * @param message - Deprecation message (e.g. 'Use channel.messages.fetch() instead.')
 */
const warned = new Set<string>();

function isSuppressed(): boolean {
  try {
    const g = typeof globalThis !== 'undefined' ? globalThis : (void 0 as unknown);
    const proc =
      g && typeof (g as Record<string, unknown>).process === 'object'
        ? (g as { process?: { env?: Record<string, string> } }).process
        : undefined;
    return proc?.env?.FLUXER_SUPPRESS_DEPRECATION === '1';
  } catch {
    return false;
  }
}

export function emitDeprecationWarning(symbol: string, message: string): void {
  if (isSuppressed()) return;
  if (warned.has(symbol)) return;
  warned.add(symbol);
  console.warn(`[Fluxer] DeprecationWarning: ${symbol} is deprecated. ${message}`);
}
