import { describe, expectTypeOf, it } from 'vitest';
import type {
  GatewayDispatchDataMap,
  GatewayDispatchEventData,
  GatewayDispatchEventName,
  GatewayDispatchPayload,
} from './index.js';

describe('gateway dispatch typings', () => {
  it('maps every event name to its wire payload', () => {
    expectTypeOf<keyof GatewayDispatchDataMap>().toEqualTypeOf<GatewayDispatchEventName>();
    expectTypeOf<GatewayDispatchEventData<'GUILD_DELETE'>>().toEqualTypeOf<{
      id: string;
      unavailable?: boolean;
    }>();
    expectTypeOf<GatewayDispatchPayload<'MESSAGE_DELETE'>>().toHaveProperty('d');
  });
});
