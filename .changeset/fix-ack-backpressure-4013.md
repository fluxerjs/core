---
'@fluxerjs/ws': patch
---

fix(ws): add gateway close code 4013 (AckBackpressure) and mark as reconnectable

The Fluxer gateway sends close code 4013 (`ack_backpressure`) when the
session's event acknowledgement buffer overflows. This is a transient
condition (the server had too many unacknowledged events queued) and is
safe to reconnect after.

- Add `AckBackpressure: 4013` to `GatewayCloseCodes`
- Add `case 4013` to `shouldReconnectOnClose()` so the shard auto-reconnects
