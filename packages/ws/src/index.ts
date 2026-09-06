export {
  type IIdentifyThrottler,
  SimpleIdentifyThrottler,
  type SimpleIdentifyThrottlerOptions,
} from './IdentifyThrottler.js';
export {
  DEFAULT_RESUME_TTL_MS,
  type ISessionStore,
  isSessionInfoFresh,
  MemorySessionStore,
  type SessionInfo,
} from './SessionStore.js';
export {
  DEFAULT_GUILDS_PER_SHARD,
  guildMatchesShard,
  MAX_GUILDS_PER_SHARD,
  MAX_SHARD_COUNT,
  recommendedShardCount,
  shardIdForGuild,
} from './ShardRouting.js';
export type {
  BuildShardingStrategy,
  IShardingStrategy,
  ShardStatus,
} from './Strategies/IShardingStrategy.js';
export {
  SimpleShardingStrategy,
  type SimpleShardingStrategyContext,
} from './Strategies/SimpleShardingStrategy.js';
export {
  WorkerShardingStrategy,
  type WorkerShardingStrategyOptions,
} from './Strategies/WorkerShardingStrategy.js';
export { GatewayCloseCodes } from './Utils/Constants.js';
export { getDefaultWebSocket, getDefaultWebSocketSync } from './Utils/GetWebSocket.js';
export {
  type BuildShardingStrategyFn,
  type WebSocketConstructor,
  WebSocketManager,
  type WebSocketManagerOptions,
  type WebSocketManagerRest,
} from './WebSocketManager.js';
export {
  narrowGatewayPayload,
  shouldReconnectOnClose,
  type WebSocketLike,
  WebSocketShard,
  type WebSocketShardOptions,
} from './WebSocketShard.js';
