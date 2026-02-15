/**
 * Response from GET /gateway/bot
 * url: WebSocket URL, session_start_limit: rate limit info in ms
 */
export interface APIGatewayBotResponse {
  url: string;
  shards: number;
  session_start_limit: {
    total: number;
    remaining: number;
    reset_after: number;
    max_concurrency: number;
  };
}
