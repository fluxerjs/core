import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { emitDeprecationWarning } from './deprecation.js';

describe('emitDeprecationWarning', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  const origProcess = globalThis.process;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    (globalThis as { process?: typeof origProcess }).process = origProcess;
  });

  it('emits a warning on first call', () => {
    emitDeprecationWarning('Test.symbolFirst', 'Use X instead.');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      '[Fluxer] DeprecationWarning: Test.symbolFirst is deprecated. Use X instead.',
    );
  });

  it('does not emit again for same symbol', () => {
    emitDeprecationWarning('Test.symbolDedup', 'Use X instead.');
    emitDeprecationWarning('Test.symbolDedup', 'Use X instead.');
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('emits for different symbols', () => {
    emitDeprecationWarning('A', 'Msg A');
    emitDeprecationWarning('B', 'Msg B');
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });

  it('suppresses when FLUXER_SUPPRESS_DEPRECATION=1', () => {
    (globalThis as { process?: { env?: Record<string, string> } }).process = {
      env: { FLUXER_SUPPRESS_DEPRECATION: '1' },
    };
    emitDeprecationWarning('Test.symbolFirst', 'Use X instead.');
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
