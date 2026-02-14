import { EventEmitter } from 'events';
import type { Client } from '@fluxerjs/core';
import type { VoiceChannel } from '@fluxerjs/core';
import type { GatewayVoiceServerUpdateDispatchData, GatewayVoiceStateUpdateDispatchData } from '@fluxerjs/types';
import {
  Room,
  RoomEvent,
  AudioSource,
  AudioFrame,
  LocalAudioTrack,
  TrackPublishOptions,
  TrackSource,
} from '@livekit/rtc-node';
import { buildLiveKitUrlForRtcSdk } from './livekit.js';
import { parseOpusPacketBoundaries, concatUint8Arrays } from './opusUtils.js';
import type { VoiceConnectionEvents } from './VoiceConnection.js';

const SAMPLE_RATE = 48000;
const CHANNELS = 1;
/** 10ms frames at 48kHz mono - matches typical Opus/voice. */
const FRAME_SAMPLES = 480;

/** Enable verbose audio pipeline logging. Set VOICE_DEBUG=1 in env to enable. */
const VOICE_DEBUG = process.env.VOICE_DEBUG === '1' || process.env.VOICE_DEBUG === 'true';

/** LiveKit-specific: emitted when server sends leave (token expiry, server policy, etc.). Emitted before disconnect. */
export type LiveKitRtcConnectionEvents = VoiceConnectionEvents & { serverLeave: [] };

export class LiveKitRtcConnection extends EventEmitter {
  readonly client: Client;
  readonly channel: VoiceChannel;
  readonly guildId: string;
  private _playing = false;
  private _destroyed = false;
  private room: Room | null = null;
  private audioSource: AudioSource | null = null;
  private audioTrack: LocalAudioTrack | null = null;
  private currentStream: { destroy?: () => void } | null = null;
  private lastServerEndpoint: string | null = null;
  private lastServerToken: string | null = null;
  private _disconnectEmitted = false;

  constructor(client: Client, channel: VoiceChannel, _userId: string) {
    super();
    this.client = client;
    this.channel = channel;
    this.guildId = channel.guildId;
  }

  get playing(): boolean {
    return this._playing;
  }

  private debug(msg: string, data?: object | string): void {
    console.error('[voice LiveKitRtc]', msg, data ?? '');
  }

  private audioDebug(msg: string, data?: object): void {
    if (VOICE_DEBUG) {
      console.error('[voice LiveKitRtc audio]', msg, data ?? '');
    }
  }

  private emitDisconnect(source: string): void {
    if (this._disconnectEmitted) return;
    this._disconnectEmitted = true;
    this.debug('emitting disconnect', { source });
    this.emit('disconnect');
  }

  /** Returns true if the LiveKit room is connected and not destroyed. */
  isConnected(): boolean {
    return !this._destroyed && this.room != null && this.room.isConnected;
  }

  /** Returns true if we're already connected to the given server (skip migration). */
  isSameServer(endpoint: string | null, token: string): boolean {
    const ep = (endpoint ?? '').trim();
    return ep === (this.lastServerEndpoint ?? '') && token === (this.lastServerToken ?? '');
  }

  playOpus(_stream: NodeJS.ReadableStream): void {
    this.emit('error', new Error('LiveKit: playOpus not supported; use play(url) with a WebM/Opus URL'));
  }

  async connect(server: GatewayVoiceServerUpdateDispatchData, _state: GatewayVoiceStateUpdateDispatchData): Promise<void> {
    const raw = (server.endpoint ?? '').trim();
    const token = server.token;
    if (!raw || !token) {
      this.emit('error', new Error('Missing voice server endpoint or token'));
      return;
    }

    const url = buildLiveKitUrlForRtcSdk(raw);
    this._disconnectEmitted = false;

    try {
      const room = new Room();
      this.room = room;

      room.on(RoomEvent.Disconnected, () => {
        this.debug('Room disconnected');
        this.lastServerEndpoint = null;
        this.lastServerToken = null;
        setImmediate(() => this.emit('serverLeave'));
        this.emitDisconnect('room_disconnected');
      });

      room.on(RoomEvent.Reconnecting, () => {
        this.debug('Room reconnecting');
      });

      room.on(RoomEvent.Reconnected, () => {
        this.debug('Room reconnected');
      });

      await room.connect(url, token, { autoSubscribe: false, dynacast: false });
      this.lastServerEndpoint = raw;
      this.lastServerToken = token;
      this.debug('connected to room');
      this.emit('ready');
    } catch (e) {
      this.room = null;
      const err = e instanceof Error ? e : new Error(String(e));
      this.emit('error', err);
      throw err;
    }
  }

  async play(urlOrStream: string | NodeJS.ReadableStream): Promise<void> {
    this.stop();
    if (!this.room || !this.room.isConnected) {
      this.emit('error', new Error('LiveKit: not connected'));
      return;
    }

    const { opus: prismOpus } = await import('prism-media');
    const { Readable } = await import('stream');
    const { OpusDecoder } = await import('opus-decoder');

    let inputStream: NodeJS.ReadableStream;
    if (typeof urlOrStream === 'string') {
      try {
        const response = await fetch(urlOrStream);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!response.body) throw new Error('No response body');
        inputStream = Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]);
      } catch (e) {
        this.emit('error', e instanceof Error ? e : new Error(String(e)));
        return;
      }
    } else {
      inputStream = urlOrStream;
    }

    const source = new AudioSource(SAMPLE_RATE, CHANNELS);
    this.audioSource = source;
    const track = LocalAudioTrack.createAudioTrack('audio', source);
    this.audioTrack = track;

    const options = new TrackPublishOptions();
    options.source = TrackSource.SOURCE_MICROPHONE;

    await this.room.localParticipant!.publishTrack(track, options);

    const demuxer = new prismOpus.WebmDemuxer();
    (inputStream as NodeJS.ReadableStream).pipe(demuxer);
    this.currentStream = demuxer;

    const decoder = new OpusDecoder({ sampleRate: SAMPLE_RATE, channels: CHANNELS });
    await decoder.ready;

    this._playing = true;

    function floatToInt16(float32: Float32Array): Int16Array {
      const int16 = new Int16Array(float32.length);
      for (let i = 0; i < float32.length; i++) {
        let s = float32[i];
        if (!Number.isFinite(s)) {
          int16[i] = 0;
          continue;
        }
        s = Math.max(-1, Math.min(1, s));
        const scale = s < 0 ? 0x8000 : 0x7fff;
        const dither = (Math.random() + Math.random() - 1) * 0.5;
        const scaled = Math.round(s * scale + dither);
        int16[i] = Math.max(-0x8000, Math.min(0x7fff, scaled));
      }
      return int16;
    }

    let sampleBuffer = new Int16Array(0);
    let opusBuffer: Uint8Array = new Uint8Array(0);
    let streamEnded = false;
    let framesCaptured = 0;

    const processOneOpusFrame = async (frame: Uint8Array): Promise<void> => {
      if (frame.length < 2) return;
      try {
        const result = decoder.decodeFrame(frame);
        if (!result?.channelData?.[0]?.length) return;

        const int16 = floatToInt16(result.channelData[0]);

        const newBuffer = new Int16Array(sampleBuffer.length + int16.length);
        newBuffer.set(sampleBuffer);
        newBuffer.set(int16, sampleBuffer.length);
        sampleBuffer = newBuffer;

        while (sampleBuffer.length >= FRAME_SAMPLES && this._playing && source) {
          const outSamples = sampleBuffer.subarray(0, FRAME_SAMPLES);
          sampleBuffer = sampleBuffer.subarray(FRAME_SAMPLES).slice(); // copy remainder

          const audioFrame = new AudioFrame(outSamples, SAMPLE_RATE, CHANNELS, FRAME_SAMPLES);

          if (source.queuedDuration > 500) {
            await source.waitForPlayout();
          }
          await source.captureFrame(audioFrame);
          framesCaptured++;
        }
      } catch (err) {
        if (VOICE_DEBUG) this.audioDebug('decode error', { error: String(err) });
      }
    };

    let firstChunk = true;
    let processing = false;
    const opusFrameQueue: Uint8Array[] = [];

    const drainOpusQueue = async () => {
      if (processing || opusFrameQueue.length === 0) return;
      processing = true;
      while (opusFrameQueue.length > 0 && this._playing && source) {
        const frame = opusFrameQueue.shift()!;
        await processOneOpusFrame(frame);
      }
      processing = false;
    };

    demuxer.on('data', (chunk: Buffer) => {
      if (!this._playing) return;
      if (firstChunk) {
        this.audioDebug('first audio chunk received', { size: chunk.length });
        firstChunk = false;
      }
      opusBuffer = concatUint8Arrays(opusBuffer, new Uint8Array(chunk));

      while (opusBuffer.length > 0) {
        const parsed = parseOpusPacketBoundaries(opusBuffer);
        if (!parsed) break;
        opusBuffer = opusBuffer.slice(parsed.consumed);
        for (const frame of parsed.frames) {
          opusFrameQueue.push(frame);
        }
      }
      drainOpusQueue().catch((e) => this.audioDebug('drainOpusQueue error', { error: String(e) }));
    });

    demuxer.on('error', (err: Error) => {
      this.audioDebug('demuxer error', { error: err.message });
      this._playing = false;
      this.currentStream = null;
      this.emit('error', err);
    });

    demuxer.on('end', async () => {
      streamEnded = true;
      this.audioDebug('stream ended', { framesCaptured });

      while (processing || opusFrameQueue.length > 0) {
        await drainOpusQueue();
        await new Promise((r) => setImmediate(r));
      }

      while (sampleBuffer.length >= FRAME_SAMPLES && this._playing && source) {
        const outSamples = sampleBuffer.subarray(0, FRAME_SAMPLES);
        sampleBuffer = sampleBuffer.subarray(FRAME_SAMPLES).slice();
        const audioFrame = new AudioFrame(outSamples, SAMPLE_RATE, CHANNELS, FRAME_SAMPLES);
        await source.captureFrame(audioFrame);
        framesCaptured++;
      }

      if (sampleBuffer.length > 0 && this._playing && source) {
        const padded = new Int16Array(FRAME_SAMPLES);
        padded.set(sampleBuffer);
        const audioFrame = new AudioFrame(padded, SAMPLE_RATE, CHANNELS, FRAME_SAMPLES);
        await source.captureFrame(audioFrame);
        framesCaptured++;
      }

      this.audioDebug('playback complete', { framesCaptured });
      this._playing = false;
      this.currentStream = null;
      if (this.audioTrack) {
        await this.audioTrack.close();
        this.audioTrack = null;
      }
      if (this.audioSource) {
        await this.audioSource.close();
        this.audioSource = null;
      }
    });
  }

  stop(): void {
    this._playing = false;
    if (this.currentStream?.destroy) this.currentStream.destroy();
    this.currentStream = null;
    if (this.audioTrack) {
      this.audioTrack.close().catch(() => {});
      this.audioTrack = null;
    }
    if (this.audioSource) {
      this.audioSource.close().catch(() => {});
      this.audioSource = null;
    }
  }

  disconnect(): void {
    this._destroyed = true;
    this.stop();
    if (this.room) {
      this.room.disconnect().catch(() => {});
      this.room = null;
    }
    this.lastServerEndpoint = null;
    this.lastServerToken = null;
    this.emit('disconnect');
  }

  destroy(): void {
    this.disconnect();
    this.removeAllListeners();
  }
}

declare module 'events' {
  interface LiveKitRtcConnection {
    on<E extends keyof LiveKitRtcConnectionEvents>(
      event: E,
      listener: (...args: LiveKitRtcConnectionEvents[E]) => void
    ): this;
    emit<E extends keyof LiveKitRtcConnectionEvents>(event: E, ...args: LiveKitRtcConnectionEvents[E]): boolean;
  }
}
