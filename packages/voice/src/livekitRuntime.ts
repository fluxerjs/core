import { dispose, type Room } from '@livekit/rtc-node';

const activeRooms = new Set<Room>();
const pendingDisconnects = new Set<Promise<void>>();
const roomDisconnects = new WeakMap<Room, Promise<void>>();
let shutdownPromise: Promise<void> | null = null;
let shutdownStarted = false;

export function registerLiveKitRoom(room: Room): void {
  if (shutdownStarted) {
    throw new Error('LiveKit has been shut down and cannot create new voice connections');
  }
  activeRooms.add(room);
}

export function releaseLiveKitRoom(room: Room): void {
  activeRooms.delete(room);
}

export function disconnectLiveKitRoom(room: Room): void {
  releaseLiveKitRoom(room);
  if (roomDisconnects.has(room)) return;

  let pending: Promise<void>;
  pending = Promise.resolve()
    .then(() => room.disconnect())
    .finally(() => pendingDisconnects.delete(pending));
  roomDisconnects.set(room, pending);
  pendingDisconnects.add(pending);

  // Individual connection teardown remains synchronous for compatibility.
  // shutdownLiveKit() observes pending cleanup before disposing the shared runtime.
  void pending.catch(() => {});
}

/**
 * Dispose the process-wide LiveKit runtime.
 *
 * Call this once, after leaving every LiveKit voice channel, when the process is
 * shutting down. LiveKit cannot create new connections after this resolves.
 */
export function shutdownLiveKit(): Promise<void> {
  if (shutdownPromise) return shutdownPromise;
  if (activeRooms.size > 0) {
    return Promise.reject(
      new Error('Cannot shut down LiveKit while voice connections are still active'),
    );
  }

  shutdownStarted = true;
  shutdownPromise = (async () => {
    await Promise.allSettled([...pendingDisconnects]);
    await dispose();
  })();
  return shutdownPromise;
}
