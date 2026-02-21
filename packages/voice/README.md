# @fluxerjs/voice

Voice for Fluxer bots. Join channels and play WebM/Opus audio.

## Install

```bash
pnpm add @fluxerjs/voice @fluxerjs/core
```

## Usage

```javascript
import { getVoiceManager, LiveKitRtcConnection } from '@fluxerjs/voice';

const voiceManager = getVoiceManager(client);
const connection = await voiceManager.join(channel);
await connection.play(streamUrl);

// Inbound transcription / speech-to-text pipeline
if (connection instanceof LiveKitRtcConnection) {
  const subs = voiceManager.subscribeChannelParticipants(channel.id);
  connection.on('speakerStart', ({ participantId }) => {
    console.log('speaker start', participantId);
  });
  connection.on('speakerStop', ({ participantId }) => {
    console.log('speaker stop', participantId);
  });
  connection.on('audioFrame', (frame) => {
    // frame.samples is Int16 PCM suitable for WAV/STT pipelines
    console.log(frame.participantId, frame.sampleRate, frame.channels, frame.samples.length);
  });

  // cleanup subscriptions when done
  for (const sub of subs) sub.stop();
}

connection.stop();
voiceManager.leave(guildId);
```

Use yt-dlp to get stream URLs from YouTube. For LiveKit, listen for `serverLeave` to reconnect.
