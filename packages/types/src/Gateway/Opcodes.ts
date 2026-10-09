/**
 * Gateway opcodes sent by the Fluxer gateway.
 * - `Dispatch` — event dispatch (t = event name, d = event data)
 * - `Heartbeat` — heartbeat ping/pong
 * - `Identify` — identify connection (initial handshake)
 * - `PresenceUpdate` — update presence (status, activity, custom status)
 * - `VoiceStateUpdate` — update voice state (join/leave/mute/deaf)
 * - `VoiceServerPing` — ping voice server
 * - `Resume` — resume connection after disconnect
 * - `Reconnect` — server requests reconnect
 * - `RequestGuildMembers` — request guild members chunk
 * - `InvalidSession` — session invalid, re-identify
 * - `Hello` — server hello (heartbeat_interval)
 * - `HeartbeatAck` — heartbeat acknowledged
 * - `GatewayError` — gateway error
 * - `LazyRequest` — lazy load guilds/channels
 * - `RequestGuildCounts` — request guild member/online counts
 * - `RequestChannelMemberCounts` — request per-channel member counts
 * - `RequestForumUnreads`: request unread counts for forum or media posts
 * @see https://docs.fluxer.app/gateway/opcodes
 */
export enum GatewayOpcodes {
  Dispatch = 0,
  Heartbeat = 1,
  Identify = 2,
  PresenceUpdate = 3,
  VoiceStateUpdate = 4,
  VoiceServerPing = 5,
  Resume = 6,
  Reconnect = 7,
  RequestGuildMembers = 8,
  InvalidSession = 9,
  Hello = 10,
  HeartbeatAck = 11,
  GatewayError = 12,
  LazyRequest = 14,
  RequestGuildCounts = 15,
  RequestChannelMemberCounts = 16,
  RequestForumUnreads = 28,
}
