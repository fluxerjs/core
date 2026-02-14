# @fluxerjs/voice

Voice for Fluxer bots. Join channels and play WebM/Opus audio.

## Install

```bash
pnpm add @fluxerjs/voice @fluxerjs/core
```

## Usage

```javascript
import { getVoiceManager } from '@fluxerjs/voice';

const voiceManager = getVoiceManager(client);
const connection = await voiceManager.join(channel);
await connection.play(streamUrl);

connection.stop();
voiceManager.leave(guildId);
```

Use yt-dlp to get stream URLs from YouTube. For LiveKit, listen for `serverLeave` to reconnect.
