---
'@fluxerjs/types': patch
'@fluxerjs/core': patch
---

Describe nested READY and GUILD_CREATE guild snapshots, including their resource collections and unavailable markers. Add an event-to-payload map and discriminated dispatch type for gateway consumers. Keep uncached member updates observable, with `GuildMember.joinedAt` set to `null` until the gateway provides it.
