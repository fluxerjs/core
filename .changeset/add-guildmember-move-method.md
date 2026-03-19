---
'@fluxerjs/core': minor
---

feat(core): add GuildMember.move() method for moving members between voice channels :>

Adds a new `move()` method to the `GuildMember` class that provides an easy way to move members between voice channels or disconnect them from voice.

This method wraps the existing `edit()` functionality with a cleaner API similar to d.js:

```ts
// moves member to a different voice channel
await member.move('123456789012345678');

// disconnect said member from voice
await member.move(null);

// move with specific connection ID
await member.move('123456789012345678', 'connection-id');
```

The method requires the `MOVE_MEMBERS` permission and will throw appropriate errors if the member is not in voice or if permissions are missing.
