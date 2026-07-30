import type { Room } from '@livekit/rtc-node';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const { dispose } = vi.hoisted(() => ({
  dispose: vi.fn<() => Promise<void>>().mockResolvedValue(),
}));

vi.mock('@livekit/rtc-node', () => ({ dispose }));

describe('LiveKit runtime shutdown', () => {
  let disconnectLiveKitRoom: (room: Room) => void;
  let registerLiveKitRoom: (room: Room) => void;
  let releaseLiveKitRoom: (room: Room) => void;
  let shutdownLiveKit: () => Promise<void>;

  beforeAll(async () => {
    ({ disconnectLiveKitRoom, registerLiveKitRoom, releaseLiveKitRoom, shutdownLiveKit } =
      await import('./livekitRuntime.js'));
  });

  it('waits for room cleanup and prevents reuse after terminal shutdown', async () => {
    let finishDisconnect: (() => void) | undefined;
    const disconnect = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishDisconnect = resolve;
        }),
    );
    const room = { disconnect } as unknown as Room;
    const serverDisconnectedRoom = {} as Room;

    registerLiveKitRoom(room);
    registerLiveKitRoom(serverDisconnectedRoom);
    releaseLiveKitRoom(serverDisconnectedRoom);
    await expect(shutdownLiveKit()).rejects.toThrow(
      'Cannot shut down LiveKit while voice connections are still active',
    );
    expect(dispose).not.toHaveBeenCalled();

    disconnectLiveKitRoom(room);
    disconnectLiveKitRoom(room);
    const shutdown = shutdownLiveKit();
    await Promise.resolve();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(dispose).not.toHaveBeenCalled();

    finishDisconnect?.();
    await shutdown;
    expect(dispose).toHaveBeenCalledOnce();

    expect(() => registerLiveKitRoom(room)).toThrow(
      'LiveKit has been shut down and cannot create new voice connections',
    );
    await expect(shutdownLiveKit()).resolves.toBeUndefined();
    expect(dispose).toHaveBeenCalledOnce();
  });
});
