---
'@fluxerjs/core': patch
'@fluxerjs/ws': patch
---

Prevent completed or failed stale login attempts from replacing a newer client connection. Cancel superseded or destroyed gateway retry backoff immediately.
