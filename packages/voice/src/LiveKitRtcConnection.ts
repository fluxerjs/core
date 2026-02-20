import { execFile, spawn } from 'node:child_process';
import { EventEmitter } from 'events';
import { Client } from '@fluxerjs/core';
import { VoiceChannel } from '@fluxerjs/core';
import {
  GatewayVoiceServerUpdateDispatchData,
  GatewayVoiceStateUpdateDispatchData,
} from '@fluxerjs/types';
import {
  Room,
  RoomEvent,
  AudioSource,
  AudioFrame,
  LocalAudioTrack,
  LocalVideoTrack,
  TrackPublishOptions,
  TrackSource,
  VideoBufferType,
  VideoFrame,
  VideoSource,
} from '@livekit/rtc-node';
import { buildLiveKitUrlForRtcSdk } from './livekit.js';
import { parseOpusPacketBoundaries, concatUint8Arrays } from './opusUtils.js';
import { VoiceConnectionEvents } from './VoiceConnection.js';
import { Readable } from 'node:stream';
import { OpusDecoder } from 'opus-decoder';
import { opus } from 'prism-media';
import { promisify } from 'node:util';
import { createFile } from 'mp4box';
import * as WebCodecs from 'node-webcodecs';

const SAMPLE_RATE = 48000;
const CHANNELS = 1;

/** avcC box structure from mp4box (AVCConfigurationBox). */
interface AvcCBox {
  configurationVersion: number;
  AVCProfileIndication: number;
  profile_compatibility: number;
  AVCLevelIndication: number;
  lengthSizeMinusOne: number;
  SPS: Array<{ length: number; nalu: Uint8Array | number[] }>;
  PPS: Array<{ length: number; nalu: Uint8Array | number[] }>;
  ext?: Uint8Array | number[];
}

/** Get byte length of nalu (handles TypedArray, ArrayBuffer, number[]). */
function getNaluByteLength(nalu: Uint8Array | number[] | ArrayBuffer): number {
  if (ArrayBuffer.isView(nalu)) return nalu.byteLength;
  if (nalu instanceof ArrayBuffer) return nalu.byteLength;
  if (Array.isArray(nalu)) return nalu.length;
  return 0;
}

/** Convert nalu to Uint8Array for safe copying (handles TypedArray, ArrayBuffer, number[]). */
function toUint8Array(nalu: Uint8Array | number[] | ArrayBuffer): Uint8Array {
  if (nalu instanceof Uint8Array) return nalu;
  if (ArrayBuffer.isView(nalu))
    return new Uint8Array(nalu.buffer, nalu.byteOffset, nalu.byteLength);
  if (nalu instanceof ArrayBuffer) return new Uint8Array(nalu);
  if (Array.isArray(nalu)) return new Uint8Array(nalu);
  return new Uint8Array(0);
}

/** Extract AAC AudioSpecificConfig from mp4box mp4a sample entry (esds -> DecoderSpecificInfo). */
function _getAacDecoderDescription(mp4aEntry: {
  esds?: {
    esd?: {
      findDescriptor: (tag: number) => { findDescriptor: (tag: number) => { data?: Uint8Array } };
    };
  };
}): ArrayBuffer | undefined {
  try {
    const esd = mp4aEntry.esds?.esd;
    if (!esd) return undefined;
    const dcd = esd.findDescriptor(0x04); // DecoderConfigDescriptor
    if (!dcd) return undefined;
    const dsi = dcd.findDescriptor(0x05); // DecoderSpecificInfo
    if (!dsi?.data?.length) return undefined;
    return dsi.data.buffer.slice(
      dsi.data.byteOffset,
      dsi.data.byteOffset + dsi.data.byteLength,
    ) as ArrayBuffer;
  } catch {
    return undefined;
  }
}

/** Build AVCDecoderConfigurationRecord (ISO 14496-15) from mp4box avcC for WebCodecs VideoDecoder. */
function buildAvcDecoderConfig(avcC: AvcCBox): ArrayBuffer | undefined {
  try {
    let size = 6; // config version + profile + compat + level + (lengthSize|0xFC) + (nbSPS|0xE0)
    for (const s of avcC.SPS) size += 2 + getNaluByteLength(s.nalu);
    size += 1; // nb_PPS
    for (const p of avcC.PPS) size += 2 + getNaluByteLength(p.nalu);
    if (avcC.ext) size += getNaluByteLength(avcC.ext);

    const buf = new ArrayBuffer(size);
    const view = new DataView(buf);
    const arr = new Uint8Array(buf);
    let offset = 0;

    view.setUint8(offset++, avcC.configurationVersion);
    view.setUint8(offset++, avcC.AVCProfileIndication);
    view.setUint8(offset++, avcC.profile_compatibility);
    view.setUint8(offset++, avcC.AVCLevelIndication);
    view.setUint8(offset++, (avcC.lengthSizeMinusOne & 0x3) | 0xfc);
    view.setUint8(offset++, (avcC.SPS.length & 0x1f) | 0xe0);

    for (const s of avcC.SPS) {
      const naluBytes = toUint8Array(s.nalu);
      const naluLen = naluBytes.byteLength;
      if (offset + 2 + naluLen > size) return undefined;
      view.setUint16(offset, naluLen, false);
      offset += 2;
      arr.set(naluBytes, offset);
      offset += naluLen;
    }
    view.setUint8(offset++, avcC.PPS.length);
    for (const p of avcC.PPS) {
      const naluBytes = toUint8Array(p.nalu);
      const naluLen = naluBytes.byteLength;
      if (offset + 2 + naluLen > size) return undefined;
      view.setUint16(offset, naluLen, false);
      offset += 2;
      arr.set(naluBytes, offset);
      offset += naluLen;
    }
    if (avcC.ext) {
      const extBytes = toUint8Array(avcC.ext);
      if (offset + extBytes.byteLength > size) return undefined;
      arr.set(extBytes, offset);
    }
    return buf;
  } catch {
    return undefined;
  }
}
/** 10ms frames at 48kHz mono - matches typical Opus/voice. */
const FRAME_SAMPLES = 480;

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

function applyVolumeToInt16(
  samples: Int16Array,
  volumePercent: number | null | undefined,
): Int16Array {
  const vol = (volumePercent ?? 100) / 100;
  if (vol === 1) return samples;
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    out[i] = Math.max(-32768, Math.min(32767, Math.round(samples[i] * vol)));
  }
  return out;
}

/** Enable verbose audio pipeline logging. Set VOICE_DEBUG=1 in env to enable. */
const VOICE_DEBUG = process.env.VOICE_DEBUG === '1' || process.env.VOICE_DEBUG === 'true';

/** LiveKit-specific: emitted when server sends leave (token expiry, server policy, etc.). Emitted before disconnect. */
export type LiveKitRtcConnectionEvents = VoiceConnectionEvents & {
  serverLeave: [];
  /** Emitted when voice state should be synced (self_stream/self_video). VoiceManager listens. */
  requestVoiceStateSync: [payload: { self_stream?: boolean; self_video?: boolean }];
};

/**
 * Options for video playback via {@link LiveKitRtcConnection.playVideo}.
 *
 * @property source - Track source hint sent to LiveKit. Use `'camera'` for typical video streams
 *   (default) or `'screenshare'` for screen-share-style content. Affects how clients may display the track.
 * @property loop - When true (default), loops the video continuously to keep the stream live. Required for
 *   LiveKit: "stream it continuously for the benefit of participants joining after the initial frame."
 * @property useFFmpeg - When true, use FFmpeg subprocess for decoding instead of node-webcodecs.
 *   Recommended when node-webcodecs causes libc++abi crashes on macOS. Requires ffmpeg in PATH.
 *   Also set via FLUXER_VIDEO_FFMPEG=1 env.
 * @property videoBitrate - Max video bitrate in bps (default: 2_500_000). Higher values improve quality.
 * @property maxFramerate - Max framerate for encoding (default: 60).
 * @property width - Output width (default: source). FFmpeg path only.
 * @property height - Output height (default: source). FFmpeg path only.
 * @property resolution - Output resolution. When set, overrides width/height and maxFramerate. FFmpeg path only.
 *   480p, 720p, 1080p, 1440p, 4k = @ 30fps.
 */
export interface VideoPlayOptions {
  /** Track source hint - camera or screenshare (default: camera). */
  source?: 'camera' | 'screenshare';
  /** Loop video to keep stream continuously live (default: true). */
  loop?: boolean;
  /** Use FFmpeg for decoding (avoids node-webcodecs; requires ffmpeg in PATH). */
  useFFmpeg?: boolean;
  /** Max video bitrate in bps for encoding (default: 2_500_000). */
  videoBitrate?: number;
  /** Max framerate for encoding (default: 60). */
  maxFramerate?: number;
  /** Output width for resolution override (FFmpeg path). */
  width?: number;
  /** Output height for resolution override (FFmpeg path). */
  height?: number;
  /** Output resolution. When set, overrides width/height and maxFramerate. FFmpeg path only. */
  resolution?: '480p' | '720p' | '1080p' | '1440p' | '4k';
}

/**
 * Voice connection using LiveKit RTC. Used when Fluxer routes voice to LiveKit.
 *
 * Supports both audio playback ({@link play}) and video streaming ({@link playVideo}) to voice channels.
 * Video uses node-webcodecs for decoding (no ffmpeg subprocess). Audio uses prism-media WebM demuxer.
 *
 * @emits ready - When connected to the LiveKit room and ready for playback
 * @emits disconnect - When disconnected from the room
 * @emits serverLeave - When LiveKit server signals leave (e.g. token expiry), before disconnect
 * @emits error - On connection, playback, or decoding errors
 */
export class LiveKitRtcConnection extends EventEmitter {
  readonly client: Client;
  readonly channel: VoiceChannel;
  readonly guildId: string;
  private _volume = 100;
  private _playing = false;
  private _playingVideo = false;
  private _destroyed = false;
  private room: Room | null = null;
  private audioSource: AudioSource | null = null;
  private audioTrack: LocalAudioTrack | null = null;
  private videoSource: VideoSource | null = null;
  private videoTrack: LocalVideoTrack | null = null;
  private currentStream: { destroy?: () => void } | null = null;
  private currentVideoStream: { destroy?: () => void } | null = null;
  private _videoCleanup: (() => void) | null = null;
  private lastServerEndpoint: string | null = null;
  private lastServerToken: string | null = null;
  private _disconnectEmitted = false;

  /**
   * @param client - The Fluxer client instance
   * @param channel - The voice channel to connect to
   * @param _userId - The user ID (reserved for future use)
   */
  constructor(client: Client, channel: VoiceChannel, _userId: string) {
    super();
    this.client = client;
    this.channel = channel;
    this.guildId = channel.guildId;
  }

  /** Whether audio is currently playing. */
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

  /**
   * Returns true if we're already connected to the given server (skip migration).
   * @param endpoint - Voice server endpoint from the gateway
   * @param token - Voice server token
   */
  isSameServer(endpoint: string | null, token: string): boolean {
    const ep = (endpoint ?? '').trim();
    return ep === (this.lastServerEndpoint ?? '') && token === (this.lastServerToken ?? '');
  }

  /** Set playback volume (0-200, 100 = normal). Affects current and future playback. */
  setVolume(volumePercent: number): void {
    this._volume = Math.max(0, Math.min(200, volumePercent ?? 100));
  }

  /** Get current volume (0-200). */
  getVolume(): number {
    return this._volume ?? 100;
  }

  playOpus(_stream: NodeJS.ReadableStream): void {
    this.emit(
      'error',
      new Error('LiveKit: playOpus not supported; use play(url) with a WebM/Opus URL'),
    );
  }

  /**
   * Connect to the LiveKit room using voice server and state from the gateway.
   * Called internally by VoiceManager; typically not used directly.
   *
   * @param server - Voice server update data (endpoint, token)
   * @param _state - Voice state update data (session, channel)
   */
  async connect(
    server: GatewayVoiceServerUpdateDispatchData,
    _state: GatewayVoiceStateUpdateDispatchData,
  ): Promise<void> {
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

  /** Whether a video track is currently playing in the voice channel. */
  get playingVideo(): boolean {
    return this._playingVideo;
  }

  /**
   * Play video from an MP4 URL or buffer. Streams decoded frames to the LiveKit room as a video track.
   * Uses node-webcodecs for decoding (no ffmpeg). Supports H.264 (avc1) and H.265 (hvc1/hev1) codecs.
   *
   * @param urlOrBuffer - Video source: HTTP(S) URL to an MP4 file, or raw ArrayBuffer/Uint8Array of MP4 data
   * @param options - Optional playback options (see {@link VideoPlayOptions})
   * @emits error - On fetch failure, missing video track, or decode errors
   *
   * @example
   * ```ts
   * const conn = await voiceManager.join(channel);
   * if (conn instanceof LiveKitRtcConnection && conn.isConnected()) {
   *   await conn.playVideo('https://example.com/video.mp4', { source: 'camera' });
   * }
   * ```
   */
  async playVideo(
    urlOrBuffer: string | ArrayBuffer | Uint8Array,
    options?: VideoPlayOptions,
  ): Promise<void> {
    this.stopVideo();
    if (!this.room || !this.room.isConnected) {
      this.emit('error', new Error('LiveKit: not connected'));
      return;
    }

    let useFFmpeg = options?.useFFmpeg ?? process.env.FLUXER_VIDEO_FFMPEG === '1';
    if (options?.resolution) useFFmpeg = true; // resolution requires FFmpeg path
    if (useFFmpeg && typeof urlOrBuffer === 'string') {
      await this.playVideoFFmpeg(urlOrBuffer, options);
      return;
    }
    if (useFFmpeg && (urlOrBuffer instanceof ArrayBuffer || urlOrBuffer instanceof Uint8Array)) {
      this.emit('error', new Error('useFFmpeg requires a URL; buffer/ArrayBuffer not supported'));
      return;
    }

    let VideoDecoder: typeof WebCodecs.VideoDecoder;
    let EncodedVideoChunk: typeof WebCodecs.EncodedVideoChunk;
    try {
      VideoDecoder = WebCodecs.VideoDecoder;
      EncodedVideoChunk = WebCodecs.EncodedVideoChunk;
    } catch {
      this.emit(
        'error',
        new Error(
          'node-webcodecs is not available (optional dependency failed to install). Use options.useFFmpeg with a URL, or install node-webcodecs.',
        ),
      );
      return;
    }

    const videoUrl = typeof urlOrBuffer === 'string' ? urlOrBuffer : null;

    let arrayBuffer: ArrayBuffer;
    if (typeof urlOrBuffer === 'string') {
      try {
        const response = await fetch(urlOrBuffer);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buf = await response.arrayBuffer();
        arrayBuffer = buf;
      } catch (e) {
        this.emit('error', e instanceof Error ? e : new Error(String(e)));
        return;
      }
    } else if (urlOrBuffer instanceof Uint8Array) {
      arrayBuffer = urlOrBuffer.buffer.slice(
        urlOrBuffer.byteOffset,
        urlOrBuffer.byteOffset + urlOrBuffer.byteLength,
      ) as ArrayBuffer;
    } else {
      arrayBuffer = urlOrBuffer;
    }

    const file = createFile();
    const sourceOption = options?.source ?? 'camera';
    const loop = options?.loop ?? true;

    file.onError = (e: Error) => {
      this._playingVideo = false;
      this.emit('error', e);
    };

    file.onReady = (info: {
      tracks?: Array<{
        id: number;
        type: string;
        codec: string;
        video?: { width: number; height: number };
        audio?: { sample_rate: number; channel_count: number };
        timescale?: number;
        nb_samples?: number;
      }>;
    }) => {
      if (!info.tracks?.length) {
        this.emit('error', new Error('No tracks found in MP4 file'));
        return;
      }
      const tracks = info.tracks;
      const videoTrack = tracks.find((t: { type: string }) => t.type === 'video');
      if (!videoTrack) {
        this.emit('error', new Error('No video track in MP4'));
        return;
      }
      const audioTrackInfo = tracks.find(
        (t: { type: string; codec: string }) => t.type === 'audio' && t.codec.startsWith('mp4a'),
      );
      const width = videoTrack.video?.width ?? 640;
      const height = videoTrack.video?.height ?? 480;
      const totalSamples = videoTrack.nb_samples ?? Number.POSITIVE_INFINITY;

      const source = new VideoSource(width, height);
      this.videoSource = source;
      const track = LocalVideoTrack.createVideoTrack('video', source);
      this.videoTrack = track;

      let audioSource: AudioSource | null = null;
      let audioTrack: LocalAudioTrack | null = null;
      let audioFfmpegProc: ReturnType<typeof spawn> | null = null;

      const decoderCodec = videoTrack.codec.startsWith('avc1')
        ? videoTrack.codec
        : videoTrack.codec.startsWith('hvc1') || videoTrack.codec.startsWith('hev1')
          ? videoTrack.codec
          : 'avc1.42E01E';

      // WebCodecs expects AVCDecoderConfigurationRecord when input is AVCC (MP4) format.
      // Without description, the decoder assumes Annex B (start codes) and fails with "No start code is found".
      let decoderDescription: ArrayBuffer | undefined;
      if (videoTrack.codec.startsWith('avc1') || videoTrack.codec.startsWith('avc3')) {
        type SampleEntry = { avcC?: AvcCBox };
        type Trak = {
          tkhd: { track_id: number };
          mdia: { minf: { stbl: { stsd: { entries: SampleEntry[] } } } };
        };
        const isoFile = file as { moov?: { traks?: Trak[] } };
        const trak = isoFile.moov?.traks?.find((t: Trak) => t.tkhd.track_id === videoTrack.id);
        const sampleEntry = trak?.mdia?.minf?.stbl?.stsd?.entries?.[0];
        const avcC = sampleEntry?.avcC;
        if (avcC) {
          decoderDescription = buildAvcDecoderConfig(avcC);
        }
      }

      // Set up audio via FFmpeg->WebM/Opus (same pipeline as play()) when URL and MP4 has audio
      if (videoUrl && audioTrackInfo) {
        audioSource = new AudioSource(SAMPLE_RATE, CHANNELS);
        this.audioSource = audioSource;
        audioTrack = LocalAudioTrack.createAudioTrack('audio', audioSource);
        this.audioTrack = audioTrack;
      }

      // Real-time pacing: queue frames and deliver via setInterval.
      // Avoids hundreds of per-frame setTimeout calls which can trigger libc++abi crashes on macOS.
      const frameQueue: Array<{
        buffer: Uint8Array;
        width: number;
        height: number;
        timestampMs: number;
      }> = [];
      let playbackStartMs: number | null = null;
      const maxFps = options?.maxFramerate ?? 60;
      const FRAME_INTERVAL_MS = Math.round(1000 / maxFps); // e.g. 17ms for 60fps
      const MAX_QUEUED_FRAMES = 30; // ~1 second - drop excess to prevent lag accumulation
      let pacingInterval: ReturnType<typeof setInterval> | null = null;

      const decoder = new VideoDecoder({
        output: async (frame: WebCodecs.VideoFrame) => {
          if (!this._playingVideo || !source) return;
          const { codedWidth, codedHeight } = frame;
          if (codedWidth <= 0 || codedHeight <= 0) {
            frame.close();
            if (VOICE_DEBUG)
              this.audioDebug('video frame skipped (invalid dimensions)', {
                codedWidth,
                codedHeight,
              });
            return;
          }
          try {
            if (playbackStartMs === null) playbackStartMs = Date.now();
            const frameTimestampUs = (frame as { timestamp?: number }).timestamp ?? 0;
            const frameTimeMs = frameTimestampUs / 1000;

            const copyOptions = frame.format !== 'I420' ? { format: 'I420' as const } : undefined;
            const size = frame.allocationSize(copyOptions);
            const buffer = new Uint8Array(size);
            await frame.copyTo(buffer, copyOptions);
            frame.close();

            const expectedI420Size = Math.ceil((codedWidth * codedHeight * 3) / 2);
            if (buffer.byteLength < expectedI420Size) {
              if (VOICE_DEBUG)
                this.audioDebug('video frame skipped (buffer too small)', {
                  codedWidth,
                  codedHeight,
                });
              return;
            }
            // Drop oldest frames when queue is full to stay in sync and prevent memory spike
            while (frameQueue.length >= MAX_QUEUED_FRAMES) {
              frameQueue.shift();
            }
            frameQueue.push({
              buffer,
              width: codedWidth,
              height: codedHeight,
              timestampMs: frameTimeMs,
            });
          } catch (err) {
            if (VOICE_DEBUG) this.audioDebug('video frame error', { error: String(err) });
          }
        },
        error: (e: Error) => {
          this.emit('error', e);
          doCleanup();
        },
      });

      decoder.configure({
        codec: decoderCodec,
        codedWidth: width,
        codedHeight: height,
        ...(decoderDescription && { description: decoderDescription }),
      });

      let samplesReceived = 0;
      let cleanupCalled = false;
      let currentFile: ReturnType<typeof createFile> = file;

      const doCleanup = () => {
        if (cleanupCalled) return;
        cleanupCalled = true;
        this._videoCleanup = null;
        this._playingVideo = false;
        if (pacingInterval) {
          clearInterval(pacingInterval);
          pacingInterval = null;
        }
        this.emit('requestVoiceStateSync', { self_stream: false, self_video: false });
        const fileObj = currentFile as unknown as { stop?: () => void };
        if (typeof fileObj.stop === 'function') {
          fileObj.stop();
        }
        try {
          decoder.close();
        } catch {
          /* decoder.close() may throw */
        }
        if (audioFfmpegProc && !audioFfmpegProc.killed) {
          audioFfmpegProc.kill('SIGKILL');
          audioFfmpegProc = null;
        }
        this.currentVideoStream = null;
        if (this.videoTrack) {
          this.videoTrack.close().catch(() => {});
          this.videoTrack = null;
        }
        if (this.videoSource) {
          this.videoSource.close().catch(() => {});
          this.videoSource = null;
        }
        if (audioTrack) {
          audioTrack.close().catch(() => {});
          this.audioTrack = null;
        }
        if (audioSource) {
          audioSource.close().catch(() => {});
          this.audioSource = null;
        }
      };

      const flushAndCleanup = () => {
        decoder.flush().then(doCleanup).catch(doCleanup);
      };

      /** Restart extraction with a fresh mp4box file to loop. Keeps stream live per LiveKit docs. */
      const scheduleLoop = (mp4File: ReturnType<typeof createFile>) => {
        setImmediate(async () => {
          if (!this._playingVideo || cleanupCalled) return;
          try {
            await decoder.flush();
            decoder.reset();
            decoder.configure({
              codec: decoderCodec,
              codedWidth: width,
              codedHeight: height,
              ...(decoderDescription && { description: decoderDescription }),
            });
            const fileObj = mp4File as unknown as { stop?: () => void };
            if (typeof fileObj.stop === 'function') fileObj.stop();
          } catch (e) {
            if (VOICE_DEBUG) this.audioDebug('loop reset error', { error: String(e) });
          }
          if (!this._playingVideo || cleanupCalled) return;
          playbackStartMs = null;
          frameQueue.length = 0;
          samplesReceived = 0;
          const loopFile = createFile();
          loopFile.onError = (e: Error) => {
            this._playingVideo = false;
            this.emit('error', e);
          };
          loopFile.onReady = (loopInfo: { tracks?: Array<{ id: number; type: string }> }) => {
            const loopTracks = loopInfo.tracks ?? [];
            const loopVt = loopTracks.find((t: { type: string }) => t.type === 'video');
            if (!loopVt || loopVt.id !== videoTrack.id) return;
            currentFile = loopFile;
            this.currentVideoStream = loopFile as unknown as {
              destroy?: () => void;
              stop?: () => void;
            };
            loopFile.setExtractionOptions(loopVt.id, null, { nbSamples: 16 });
            loopFile.onSamples = (
              tid: number,
              _u: unknown,
              samp: Array<{
                data: ArrayBuffer;
                is_sync?: boolean;
                is_rap?: boolean;
                timescale: number;
                dts: number;
                duration: number;
              }>,
            ) => {
              if (!this._playingVideo) return;
              if (tid === videoTrack.id) {
                try {
                  for (const sample of samp) {
                    const isKeyFrame =
                      sample.is_sync ?? (sample as { is_rap?: boolean }).is_rap ?? sample.dts === 0;
                    const chunk = new EncodedVideoChunk({
                      type: isKeyFrame ? 'key' : 'delta',
                      timestamp: Math.round((sample.dts / sample.timescale) * 1_000_000),
                      duration: Math.round((sample.duration / sample.timescale) * 1_000_000),
                      data: sample.data,
                    });
                    decoder.decode(chunk);
                  }
                } catch (decodeErr) {
                  this.emit(
                    'error',
                    decodeErr instanceof Error ? decodeErr : new Error(String(decodeErr)),
                  );
                  doCleanup();
                  return;
                }
                samplesReceived += samp.length;
                if (samplesReceived >= totalSamples) {
                  if (loop) scheduleLoop(loopFile);
                  else flushAndCleanup();
                }
              }
            };
            loopFile.start();
          };
          (arrayBuffer as { fileStart?: number }).fileStart = 0;
          loopFile.appendBuffer(arrayBuffer);
          loopFile.flush();
        });
      };

      this._videoCleanup = () => {
        doCleanup();
      };

      file.onSamples = (
        trackId: number,
        _user: unknown,
        samples: Array<{
          data: ArrayBuffer;
          is_sync?: boolean;
          is_rap?: boolean;
          timescale: number;
          dts: number;
          duration: number;
        }>,
      ) => {
        if (!this._playingVideo) return;
        if (trackId === videoTrack.id) {
          try {
            for (const sample of samples) {
              const isKeyFrame =
                sample.is_sync ?? (sample as { is_rap?: boolean }).is_rap ?? sample.dts === 0;
              const chunk = new EncodedVideoChunk({
                type: isKeyFrame ? 'key' : 'delta',
                timestamp: Math.round((sample.dts / sample.timescale) * 1_000_000),
                duration: Math.round((sample.duration / sample.timescale) * 1_000_000),
                data: sample.data,
              });
              decoder.decode(chunk);
            }
          } catch (decodeErr) {
            this.emit(
              'error',
              decodeErr instanceof Error ? decodeErr : new Error(String(decodeErr)),
            );
            doCleanup();
            return;
          }
          samplesReceived += samples.length;
          if (samplesReceived >= totalSamples) {
            if (loop) scheduleLoop(file);
            else flushAndCleanup();
          }
        }
      };

      const participant = this.room?.localParticipant;
      if (!participant) return;

      const publishOptions = new TrackPublishOptions({
        source:
          sourceOption === 'screenshare'
            ? TrackSource.SOURCE_SCREENSHARE
            : TrackSource.SOURCE_CAMERA,
        videoEncoding: {
          maxBitrate: BigInt(options?.videoBitrate ?? 2_500_000),
          maxFramerate: options?.maxFramerate ?? 60,
        },
      });

      const publishVideo = participant.publishTrack(track, publishOptions);
      const audioPublishOptions = new TrackPublishOptions();
      audioPublishOptions.source = TrackSource.SOURCE_MICROPHONE;
      const publishAudio = audioTrack
        ? participant.publishTrack(audioTrack, audioPublishOptions)
        : Promise.resolve();

      Promise.all([publishVideo, publishAudio])
        .then(async () => {
          this._playingVideo = true;
          this.currentVideoStream = file as unknown as { destroy?: () => void; stop?: () => void };
          file.setExtractionOptions(videoTrack.id, null, { nbSamples: 16 });
          pacingInterval = setInterval(() => {
            if (!this._playingVideo || !source || playbackStartMs === null) return;
            const elapsed = Date.now() - playbackStartMs;
            // When behind (queue backing up), drop stale frames to catch up - adaptive frame dropping
            if (frameQueue.length > 10) {
              while (frameQueue.length > 1 && frameQueue[1]!.timestampMs <= elapsed) {
                frameQueue.shift();
              }
            }
            // Deliver exactly one frame per tick for smooth 30fps pacing (avoids burst/jumpy playback)
            if (frameQueue.length > 0 && frameQueue[0]!.timestampMs <= elapsed) {
              const f = frameQueue.shift()!;
              try {
                const livekitFrame = new VideoFrame(
                  f.buffer,
                  f.width,
                  f.height,
                  VideoBufferType.I420,
                );
                source.captureFrame(livekitFrame);
              } catch (captureErr) {
                if (VOICE_DEBUG)
                  this.audioDebug('captureFrame error', { error: String(captureErr) });
                this.emit(
                  'error',
                  captureErr instanceof Error ? captureErr : new Error(String(captureErr)),
                );
              }
            }
          }, FRAME_INTERVAL_MS);
          setImmediate(() => {
            if (!this._playingVideo) return;
            file.start();
          });

          // Start FFmpeg audio pipeline (same as play()) when video has audio and we have URL
          if (videoUrl && audioSource && audioTrack) {
            const runAudioFfmpeg = async () => {
              if (!this._playingVideo || cleanupCalled || !audioSource) return;
              const audioProc = spawn(
                'ffmpeg',
                [
                  '-loglevel',
                  'warning',
                  '-re',
                  '-i',
                  videoUrl,
                  '-vn',
                  '-c:a',
                  'libopus',
                  '-f',
                  'webm',
                  ...(loop ? ['-stream_loop', '-1'] : []),
                  'pipe:1',
                ],
                { stdio: ['ignore', 'pipe', 'pipe'] },
              );
              audioFfmpegProc = audioProc;
              const demuxer = new opus.WebmDemuxer();
              if (audioProc.stdout) audioProc.stdout.pipe(demuxer);

              const decoder = new OpusDecoder({ sampleRate: SAMPLE_RATE, channels: CHANNELS });
              await decoder.ready;

              let sampleBuffer = new Int16Array(0);
              let opusBuffer = new Uint8Array(0);
              let processing = false;
              const opusFrameQueue: Uint8Array[] = [];

              const processOneOpusFrame = async (frame: Uint8Array) => {
                if (frame.length < 2 || !audioSource || !this._playingVideo) return;
                try {
                  const result = decoder.decodeFrame(frame);
                  if (!result?.channelData?.[0]?.length) return;
                  const int16 = floatToInt16(result.channelData[0]);
                  const newBuffer = new Int16Array(sampleBuffer.length + int16.length);
                  newBuffer.set(sampleBuffer);
                  newBuffer.set(int16, sampleBuffer.length);
                  sampleBuffer = newBuffer;
                  while (
                    sampleBuffer.length >= FRAME_SAMPLES &&
                    this._playingVideo &&
                    audioSource
                  ) {
                    const rawSamples = sampleBuffer.subarray(0, FRAME_SAMPLES);
                    sampleBuffer = sampleBuffer.subarray(FRAME_SAMPLES).slice();
                    const outSamples = applyVolumeToInt16(rawSamples, this._volume);
                    const audioFrame = new AudioFrame(
                      outSamples,
                      SAMPLE_RATE,
                      CHANNELS,
                      FRAME_SAMPLES,
                    );
                    if (audioSource.queuedDuration > 500) await audioSource.waitForPlayout();
                    await audioSource.captureFrame(audioFrame);
                  }
                } catch {
                  /* decoder.close() may throw */
                }
              };
              const drainQueue = async () => {
                if (processing || opusFrameQueue.length === 0) return;
                processing = true;
                while (opusFrameQueue.length > 0 && this._playingVideo && audioSource) {
                  const f = opusFrameQueue.shift()!;
                  await processOneOpusFrame(f);
                }
                processing = false;
              };

              demuxer.on('data', (chunk: Buffer) => {
                if (!this._playingVideo) return;
                opusBuffer = new Uint8Array(concatUint8Arrays(opusBuffer, new Uint8Array(chunk)));
                while (opusBuffer.length > 0) {
                  const parsed = parseOpusPacketBoundaries(opusBuffer);
                  if (!parsed) break;
                  opusBuffer = new Uint8Array(opusBuffer.subarray(parsed.consumed));
                  for (const frame of parsed.frames) opusFrameQueue.push(frame);
                }
                drainQueue().catch(() => {});
              });

              audioProc.on('exit', (code) => {
                if (audioFfmpegProc === audioProc) audioFfmpegProc = null;
                if (loop && this._playingVideo && !cleanupCalled && (code === 0 || code === null)) {
                  setImmediate(() => runAudioFfmpeg());
                }
              });
            };
            runAudioFfmpeg().catch((e) =>
              this.audioDebug('audio ffmpeg error', { error: String(e) }),
            );
          }

          this.emit('requestVoiceStateSync', {
            self_stream: sourceOption === 'screenshare',
            self_video: sourceOption === 'camera',
          });
        })
        .catch((err) => {
          this._playingVideo = false;
          this.emit('error', err instanceof Error ? err : new Error(String(err)));
        });
    };

    (arrayBuffer as { fileStart?: number }).fileStart = 0;
    file.appendBuffer(arrayBuffer);
    file.flush();
  }

  /**
   * FFmpeg-based video playback. Bypasses node-webcodecs to avoid libc++abi crashes on macOS.
   * Requires ffmpeg and ffprobe in PATH. URL input only.
   */
  private async playVideoFFmpeg(url: string, options?: VideoPlayOptions): Promise<void> {
    const sourceOption = options?.source ?? 'camera';
    const loop = options?.loop ?? true;

    let width = 640;
    let height = 480;
    let hasAudio = false;
    try {
      const exec = promisify(execFile);
      const { stdout } = await exec(
        'ffprobe',
        [
          '-v',
          'error',
          '-show_streams',
          '-show_entries',
          'stream=codec_type,width,height',
          '-of',
          'json',
          url,
        ],
        { encoding: 'utf8', timeout: 10000 },
      );
      const parsed = JSON.parse(stdout) as {
        streams?: Array<{ codec_type?: string; width?: number; height?: number }>;
      };
      const streams = parsed?.streams ?? [];
      for (const s of streams) {
        if (s.codec_type === 'video' && s.width != null && s.height != null) {
          width = s.width;
          height = s.height;
          break;
        }
      }
      for (const s of streams) {
        if (s.codec_type === 'audio') {
          hasAudio = true;
          break;
        }
      }
    } catch (probeErr) {
      this.emit(
        'error',
        new Error(
          `ffprobe failed: ${probeErr instanceof Error ? probeErr.message : String(probeErr)}`,
        ),
      );
      return;
    }
    let maxFps = options?.maxFramerate ?? 60;
    const res = options?.resolution;
    if (res === '480p') {
      width = 854;
      height = 480;
      maxFps = 60;
    } else if (res === '720p') {
      width = 1280;
      height = 720;
      maxFps = 60;
    } else if (res === '1080p') {
      width = 1920;
      height = 1080;
      maxFps = 60;
    } else if (res === '1440p') {
      width = 2560;
      height = 1440;
      maxFps = 60;
    } else if (res === '4k') {
      width = 3840;
      height = 2160;
      maxFps = 60;
    } else if (options?.width != null && options?.height != null) {
      width = options.width;
      height = options.height;
    }

    const source = new VideoSource(width, height);
    this.videoSource = source;
    const track = LocalVideoTrack.createVideoTrack('video', source);
    this.videoTrack = track;

    const publishOptions = new TrackPublishOptions({
      source:
        sourceOption === 'screenshare' ? TrackSource.SOURCE_SCREENSHARE : TrackSource.SOURCE_CAMERA,
      videoEncoding: {
        maxBitrate: BigInt(options?.videoBitrate ?? 2_500_000),
        maxFramerate: maxFps,
      },
    });

    const participant = this.room?.localParticipant;
    if (!participant) return;

    try {
      await participant.publishTrack(track, publishOptions);
    } catch (err) {
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
      return;
    }

    let audioSource: AudioSource | null = null;
    let audioReady = false;
    if (hasAudio) {
      const src = new AudioSource(SAMPLE_RATE, CHANNELS);
      audioSource = src;
      this.audioSource = src;
      const track = LocalAudioTrack.createAudioTrack('audio', src);
      this.audioTrack = track;
      try {
        await participant.publishTrack(
          track,
          new TrackPublishOptions({ source: TrackSource.SOURCE_MICROPHONE }),
        );
        audioReady = true;
      } catch {
        track.close().catch(() => {});
        this.audioTrack = null;
        this.audioSource = null;
      }
    } else {
      this.audioSource = null;
      this.audioTrack = null;
    }

    this._playingVideo = true;
    this.emit('requestVoiceStateSync', {
      self_stream: sourceOption === 'screenshare',
      self_video: sourceOption === 'camera',
    });

    const frameSize = Math.ceil((width * height * 3) / 2);
    const FRAME_INTERVAL_MS = Math.round(1000 / maxFps);
    let pacingTimeout: ReturnType<typeof setTimeout> | null = null;
    let ffmpegProc: ReturnType<typeof spawn> | null = null;
    let cleanupCalled = false;

    const doCleanup = () => {
      if (cleanupCalled) return;
      cleanupCalled = true;
      this._videoCleanup = null;
      this._playingVideo = false;
      if (pacingTimeout !== null) {
        clearTimeout(pacingTimeout);
        pacingTimeout = null;
      }
      if (ffmpegProc && !ffmpegProc.killed) {
        ffmpegProc.kill('SIGKILL');
        ffmpegProc = null;
      }
      this.emit('requestVoiceStateSync', { self_stream: false, self_video: false });
      this.currentVideoStream = null;
      if (this.audioTrack) {
        this.audioTrack.close().catch(() => {});
        this.audioTrack = null;
      }
      if (this.audioSource) {
        this.audioSource.close().catch(() => {});
        this.audioSource = null;
      }
      if (this.videoTrack) {
        this.videoTrack.close().catch(() => {});
        this.videoTrack = null;
      }
      if (this.videoSource) {
        this.videoSource.close().catch(() => {});
        this.videoSource = null;
      }
    };

    this._videoCleanup = () => doCleanup();

    const frameBuffer: Buffer[] = [];
    let frameBufferBytes = 0;
    const MAX_QUEUED_FRAMES = 60; // ~1 second at 60fps
    const FRAME_DURATION_US = BigInt(Math.round(1_000_000 / maxFps)); // per-frame duration in microseconds
    let frameIndex = 0n;

    const pushFramesFromBuffer = () => {
      if (!this._playingVideo || !source || cleanupCalled) return;
      // Send exactly ONE frame per tick for smooth 30fps pacing
      if (frameBufferBytes < frameSize) return;
      if (frameBufferBytes > frameSize * MAX_QUEUED_FRAMES) {
        // Too far ahead - drop whole frames from the front to resync
        const framesToDrop = Math.floor((frameBufferBytes - frameSize * 2) / frameSize);
        let toDropBytes = framesToDrop * frameSize;
        while (toDropBytes > 0 && frameBuffer.length > 0) {
          const c = frameBuffer[0]!;
          if (c.length <= toDropBytes) {
            toDropBytes -= c.length;
            frameBufferBytes -= c.length;
            frameBuffer.shift();
          } else {
            frameBuffer[0] = c.subarray(toDropBytes);
            frameBufferBytes -= toDropBytes;
            toDropBytes = 0;
          }
        }
      }

      let remaining = frameSize;
      const parts: Buffer[] = [];
      while (remaining > 0 && frameBuffer.length > 0) {
        const c = frameBuffer[0]!;
        const take = Math.min(remaining, c.length);
        parts.push(c.subarray(0, take));
        remaining -= take;
        if (take >= c.length) {
          frameBuffer.shift();
        } else {
          frameBuffer[0] = c.subarray(take);
        }
      }
      frameBufferBytes -= frameSize;
      const frameData = Buffer.concat(parts, frameSize);
      if (frameData.length !== frameSize) return;
      try {
        const frame = new VideoFrame(
          new Uint8Array(frameData.buffer, frameData.byteOffset, frameSize),
          width,
          height,
          VideoBufferType.I420,
        );
        const timestampUs = frameIndex * FRAME_DURATION_US;
        frameIndex += 1n;
        source.captureFrame(frame, timestampUs);
      } catch (e) {
        if (VOICE_DEBUG) this.audioDebug('captureFrame error', { error: String(e) });
      }
    };

    const scheduleNextPacing = () => {
      if (!this._playingVideo || cleanupCalled) return;
      pushFramesFromBuffer();
      pacingTimeout = setTimeout(scheduleNextPacing, FRAME_INTERVAL_MS);
    };
    scheduleNextPacing();

    const runFFmpeg = async () => {
      const ffmpegArgs = [
        '-loglevel',
        'warning',
        '-re',
        ...(loop ? ['-stream_loop', '-1'] : []),
        '-i',
        url,
        '-map',
        '0:v',
        '-vf',
        `scale=${width}:${height}`,
        '-r',
        String(maxFps),
        '-f',
        'rawvideo',
        '-pix_fmt',
        'yuv420p',
        '-an',
        'pipe:1',
        ...(hasAudio ? ['-map', '0:a', '-c:a', 'libopus', '-f', 'webm', '-vn', 'pipe:3'] : []),
      ];
      const stdioOpts: Array<'ignore' | 'pipe'> = hasAudio
        ? ['ignore', 'pipe', 'pipe', 'pipe']
        : ['ignore', 'pipe', 'pipe'];
      const proc = spawn('ffmpeg', ffmpegArgs, { stdio: stdioOpts });
      ffmpegProc = proc;

      this.currentVideoStream = {
        destroy: () => {
          if (proc && !proc.killed) proc.kill('SIGKILL');
        },
      };

      const stdout = proc.stdout;
      const stderr = proc.stderr;
      if (stdout) {
        stdout.on('data', (chunk: Buffer) => {
          if (!this._playingVideo || cleanupCalled) return;
          frameBuffer.push(chunk);
          frameBufferBytes += chunk.length;
        });
      }
      if (stderr) {
        stderr.on('data', (data: Buffer) => {
          const line = data.toString().trim();
          if (line && VOICE_DEBUG) this.audioDebug('ffmpeg stderr', { line: line.slice(0, 200) });
        });
      }

      if (hasAudio && audioReady && audioSource && proc.stdio[3]) {
        const audioPipe = proc.stdio[3] as NodeJS.ReadableStream;
        const demuxer = new opus.WebmDemuxer();
        audioPipe.pipe(demuxer);
        const decoder = new OpusDecoder({ sampleRate: SAMPLE_RATE, channels: CHANNELS });
        await decoder.ready;
        let sampleBuffer = new Int16Array(0);
        let opusBuffer = new Uint8Array(0);
        let processing = false;
        const opusFrameQueue: Uint8Array[] = [];
        const processOneOpusFrame = async (frame: Uint8Array) => {
          if (frame.length < 2 || !audioSource || !this._playingVideo) return;
          try {
            const result = decoder.decodeFrame(frame);
            if (!result?.channelData?.[0]?.length) return;
            const int16 = floatToInt16(result.channelData[0]);
            const newBuffer = new Int16Array(sampleBuffer.length + int16.length);
            newBuffer.set(sampleBuffer);
            newBuffer.set(int16, sampleBuffer.length);
            sampleBuffer = newBuffer;
            while (sampleBuffer.length >= FRAME_SAMPLES && this._playingVideo && audioSource) {
              const rawSamples = sampleBuffer.subarray(0, FRAME_SAMPLES);
              sampleBuffer = sampleBuffer.subarray(FRAME_SAMPLES).slice();
              const outSamples = applyVolumeToInt16(rawSamples, this._volume);
              const audioFrame = new AudioFrame(outSamples, SAMPLE_RATE, CHANNELS, FRAME_SAMPLES);
              if (audioSource.queuedDuration > 500) await audioSource.waitForPlayout();
              await audioSource.captureFrame(audioFrame);
            }
          } catch {
            /* decoder.close() may throw */
          }
        };
        const drainQueue = async () => {
          if (processing || opusFrameQueue.length === 0) return;
          processing = true;
          while (opusFrameQueue.length > 0 && this._playingVideo && audioSource) {
            const f = opusFrameQueue.shift()!;
            await processOneOpusFrame(f);
          }
          processing = false;
        };
        demuxer.on('data', (chunk: Buffer) => {
          if (!this._playingVideo) return;
          opusBuffer = new Uint8Array(concatUint8Arrays(opusBuffer, new Uint8Array(chunk)));
          while (opusBuffer.length > 0) {
            const parsed = parseOpusPacketBoundaries(opusBuffer);
            if (!parsed) break;
            opusBuffer = new Uint8Array(opusBuffer.subarray(parsed.consumed));
            for (const frame of parsed.frames) opusFrameQueue.push(frame);
          }
          drainQueue().catch(() => {});
        });
      }

      proc.on('error', (err) => {
        this.emit('error', err);
        doCleanup();
      });

      proc.on('exit', (code) => {
        ffmpegProc = null;
        if (cleanupCalled || !this._playingVideo) return;
        if (loop && (code === 0 || code === null)) {
          frameBuffer.length = 0;
          frameBufferBytes = 0;
          frameIndex = 0n;
          setImmediate(() => runFFmpeg());
        } else {
          doCleanup();
        }
      });
    };

    runFFmpeg().catch((e) => this.audioDebug('ffmpeg error', { error: String(e) }));
  }

  /**
   * Play audio from a WebM/Opus URL or readable stream. Publishes to the LiveKit room as an audio track.
   *
   * @param urlOrStream - Audio source: HTTP(S) URL to a WebM/Opus file, or a Node.js ReadableStream
   * @emits error - On fetch failure or decode errors
   */
  async play(urlOrStream: string | NodeJS.ReadableStream): Promise<void> {
    this.stop();
    if (!this.room || !this.room.isConnected) {
      this.emit('error', new Error('LiveKit: not connected'));
      return;
    }

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

    const demuxer = new opus.WebmDemuxer();
    (inputStream as NodeJS.ReadableStream).pipe(demuxer);
    this.currentStream = demuxer;

    const decoder = new OpusDecoder({ sampleRate: SAMPLE_RATE, channels: CHANNELS });
    await decoder.ready;

    this._playing = true;

    let sampleBuffer = new Int16Array(0);
    let opusBuffer: Uint8Array = new Uint8Array(0);
    let _streamEnded = false;
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
          const rawSamples = sampleBuffer.subarray(0, FRAME_SAMPLES);
          sampleBuffer = sampleBuffer.subarray(FRAME_SAMPLES).slice(); // copy remainder
          const outSamples = applyVolumeToInt16(rawSamples, this._volume);

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
      _streamEnded = true;
      this.audioDebug('stream ended', { framesCaptured });

      while (processing || opusFrameQueue.length > 0) {
        await drainOpusQueue();
        await new Promise((r) => setImmediate(r));
      }

      while (sampleBuffer.length >= FRAME_SAMPLES && this._playing && source) {
        const rawSamples = sampleBuffer.subarray(0, FRAME_SAMPLES);
        sampleBuffer = sampleBuffer.subarray(FRAME_SAMPLES).slice();
        const outSamples = applyVolumeToInt16(rawSamples, this._volume);
        const audioFrame = new AudioFrame(outSamples, SAMPLE_RATE, CHANNELS, FRAME_SAMPLES);
        await source.captureFrame(audioFrame);
        framesCaptured++;
      }

      if (sampleBuffer.length > 0 && this._playing && source) {
        const padded = new Int16Array(FRAME_SAMPLES);
        padded.set(sampleBuffer);
        const outSamples = applyVolumeToInt16(padded, this._volume);
        const audioFrame = new AudioFrame(outSamples, SAMPLE_RATE, CHANNELS, FRAME_SAMPLES);
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

  /**
   * Stop video playback and unpublish the video track from the LiveKit room.
   * Safe to call even when no video is playing.
   */
  private _videoCleaning = false;

  stopVideo(): void {
    if (this._videoCleaning) return;
    if (this._videoCleanup) {
      this._videoCleaning = true;
      try {
        this._videoCleanup();
      } finally {
        this._videoCleaning = false;
      }
      this._videoCleanup = null;
      return;
    }
    this._playingVideo = false;
    this.emit('requestVoiceStateSync', { self_stream: false, self_video: false });
    if (this.currentVideoStream?.destroy) this.currentVideoStream.destroy();
    this.currentVideoStream = null;
    if (this.videoTrack) {
      this.videoTrack.close().catch(() => {});
      this.videoTrack = null;
    }
    if (this.videoSource) {
      this.videoSource.close().catch(() => {});
      this.videoSource = null;
    }
  }

  /** Stop playback and clear both audio and video tracks. */
  stop(): void {
    this._playing = false;
    this.stopVideo();
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

  /** Disconnect from the LiveKit room and stop all playback. */
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

  /** Disconnect from the room and remove all event listeners. */
  destroy(): void {
    this.disconnect();
    this.removeAllListeners();
  }
}

declare module 'events' {
  interface LiveKitRtcConnection {
    on<E extends keyof LiveKitRtcConnectionEvents>(
      event: E,
      listener: (...args: LiveKitRtcConnectionEvents[E]) => void,
    ): this;
    emit<E extends keyof LiveKitRtcConnectionEvents>(
      event: E,
      ...args: LiveKitRtcConnectionEvents[E]
    ): boolean;
  }
}
