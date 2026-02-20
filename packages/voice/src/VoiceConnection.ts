import { EventEmitter } from 'events';
import { Client } from '@fluxerjs/core';
import { VoiceChannel } from '@fluxerjs/core';
import {
  GatewayVoiceServerUpdateDispatchData,
  GatewayVoiceStateUpdateDispatchData,
} from '@fluxerjs/types';
import * as nacl from 'tweetnacl';
import * as dgram from 'dgram';
import * as ws from 'ws';
import { Readable } from 'node:stream';
import { opus } from 'prism-media';
/** Minimal WebSocket type for voice (ws module). */
interface VoiceWebSocket {
  send(data: string | Buffer | ArrayBufferLike): void;
  close(code?: number): void;
  readyState: number;
  on(event: string, listener: (...args: unknown[]) => void): void;
  once(event: string, listener: (...args: unknown[]) => void): void;
  off(event: string, listener: (...args: unknown[]) => void): void;
  removeAllListeners(event?: string): void;
}

const VOICE_WS_OPCODES = {
  Identify: 0,
  SelectProtocol: 1,
  Ready: 2,
  Heartbeat: 3,
  SessionDescription: 4,
  Speaking: 5,
} as const;
const VOICE_VERSION = 4;
const CHANNELS = 2;
/** RTP timestamp increment per 20ms Opus frame (48kHz equivalent). */
const OPUS_FRAME_TICKS = 960 * (CHANNELS === 2 ? 2 : 1);
/** Interval at which Discord expects Opus frames (20ms). */
const AUDIO_FRAME_INTERVAL_MS = 20;

/** Log full HTTP response for a URL (used when WebSocket gets unexpected status e.g. 200). */
async function logFullResponse(url: string): Promise<void> {
  try {
    // fetch only supports http/https; wss:// -> https:// for the same endpoint
    const fetchUrl = url.replace(/^wss:\/\//i, 'https://').replace(/^ws:\/\//i, 'http://');
    const res = await fetch(fetchUrl, { method: 'GET' });
    const body = await res.text();
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      headers[k] = v;
    });
    console.error('[voice] Full response from', url, {
      status: res.status,
      statusText: res.statusText,
      headers,
      body: body.slice(0, 2000) + (body.length > 2000 ? '...' : ''),
    });
  } catch (e) {
    console.error('[voice] Could not fetch URL for logging:', e);
  }
}

export interface VoiceConnectionEvents {
  ready: [];
  error: [err: Error];
  disconnect: [];
}

/** Voice connection using Discord's UDP-based protocol. Emits `ready`, `error`, `disconnect`. */
export class VoiceConnection extends EventEmitter {
  readonly client: Client;
  readonly channel: VoiceChannel;
  readonly guildId: string;
  private _sessionId: string | null = null;
  private _token: string | null = null;
  private _endpoint: string | null = null;
  private _userId: string;
  private voiceWs: VoiceWebSocket | null = null;
  private udpSocket: dgram.Socket | null = null;
  private ssrc: number = 0;
  private secretKey: Uint8Array | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private sequence = 0;
  private timestamp = 0;
  private _playing = false;
  private _destroyed = false;
  private currentStream: { destroy?: () => void } | null = null;
  private remoteUdpAddress: string = '';
  private remoteUdpPort: number = 0;
  private audioPacketQueue: Buffer[] = [];
  private pacingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(client: Client, channel: VoiceChannel, userId: string) {
    super();
    this.client = client;
    this.channel = channel;
    this.guildId = channel.guildId;
    this._userId = userId;
  }

  /** Discord voice session ID. */
  get sessionId(): string | null {
    return this._sessionId;
  }

  /** Whether audio is currently playing. */
  get playing(): boolean {
    return this._playing;
  }

  /** Called when we have both server update and state update. */
  async connect(
    server: GatewayVoiceServerUpdateDispatchData,
    state: GatewayVoiceStateUpdateDispatchData,
  ): Promise<void> {
    this._token = server.token;
    const raw = (server.endpoint ?? '').trim();
    this._sessionId = state.session_id;
    if (!raw || !this._token || !this._sessionId) {
      this.emit('error', new Error('Missing voice server or session data'));
      return;
    }
    // Endpoint may be a full URL (path + query, e.g. wss://host/rtc?access_token=...) or host[/path]
    let wsUrl: string;
    if (raw.includes('?')) {
      // Full stream URL: use as-is, ensure wss
      wsUrl = /^wss?:\/\//i.test(raw) ? raw : raw.replace(/^https?:\/\//i, 'wss://');
      if (!/^wss?:\/\//i.test(wsUrl)) wsUrl = `wss://${wsUrl}`;
    } else {
      const normalized = raw.replace(/^(wss|ws|https?):\/\//i, '').replace(/^\/+/, '') || raw;
      wsUrl = `wss://${normalized}?v=${VOICE_VERSION}`;
    }
    // Host only (for UDP address fallback in Ready handler)
    const hostPart =
      raw
        .replace(/^(wss|ws|https?):\/\//i, '')
        .replace(/^\/+/, '')
        .split('/')[0] ?? '';
    this._endpoint = hostPart.split('?')[0] || hostPart;
    const WS = await this.getWebSocketConstructor();
    this.voiceWs = new WS(wsUrl);
    return new Promise((resolve, reject) => {
      const resolveReady = () => {
        cleanup();
        resolve();
        this.emit('ready');
      };
      const onOpen = () => {
        this.voiceWs!.off('error', onError);
        this.sendVoiceOp(VOICE_WS_OPCODES.Identify, {
          server_id: this.guildId,
          user_id: this._userId,
          session_id: this._sessionId!,
          token: this._token!,
        });
      };
      const onError = (err: unknown) => {
        if (err instanceof Error && /Unexpected server response/i.test(err.message)) {
          logFullResponse(wsUrl).catch(() => {});
        }
        cleanup();
        reject(err instanceof Error ? err : new Error(String(err)));
      };
      const onMessage = (data: Buffer | ArrayBuffer) => {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
        const payload = JSON.parse(buf.toString());
        const op = payload.op;
        const d = payload.d;
        if (op === VOICE_WS_OPCODES.Ready) {
          this.ssrc = d.ssrc;
          const port = d.port;
          const address = (d as { address?: string }).address ?? this._endpoint!.split(':')[0];
          this.remoteUdpAddress = address;
          this.remoteUdpPort = port;
          this.setupUDP(address, port, () => {
            // SelectProtocol sent; wait for SessionDescription before resolving
          });
        } else if (op === VOICE_WS_OPCODES.SessionDescription) {
          this.secretKey = new Uint8Array(d.secret_key);
          if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
          }
          this.heartbeatInterval = setInterval(() => {
            this.sendVoiceOp(VOICE_WS_OPCODES.Heartbeat, Date.now());
          }, d.heartbeat_interval ?? 5000);
          resolveReady();
        } else if (op === VOICE_WS_OPCODES.Heartbeat) {
          // ack
        }
      };
      const cleanup = () => {
        if (this.voiceWs) {
          this.voiceWs.removeAllListeners();
        }
      };
      const ws = this.voiceWs!;
      ws.on('open', onOpen);
      ws.on('error', onError);
      ws.on('message', (data: unknown) => onMessage(data as Buffer | ArrayBuffer));
      ws.once('close', () => {
        cleanup();
        if (!this._destroyed) reject(new Error('Voice WebSocket closed'));
      });
    });
  }

  private async getWebSocketConstructor(): Promise<new (url: string) => VoiceWebSocket> {
    try {
      return ws.default as new (url: string) => VoiceWebSocket;
    } catch {
      throw new Error('Install "ws" for voice support: pnpm add ws');
    }
  }

  private sendVoiceOp(op: number, d: unknown): void {
    if (!this.voiceWs || this.voiceWs.readyState !== 1) return;
    this.voiceWs.send(JSON.stringify({ op, d }));
  }

  private setupUDP(remoteAddress: string, remotePort: number, onReady: () => void): void {
    const socket = dgram.createSocket('udp4');
    this.udpSocket = socket;
    const discovery = Buffer.alloc(70);
    discovery.writeUInt32BE(0x00000001, 0);
    discovery.writeUInt16BE(70, 4);
    discovery.writeUInt32BE(this.ssrc, 6);
    socket.send(discovery, 0, discovery.length, remotePort, remoteAddress, () => {
      socket.once('message', (msg: Buffer) => {
        if (msg.length < 70) {
          this.emit('error', new Error('UDP discovery response too short'));
          return;
        }
        const len = msg.readUInt16BE(4);
        let ourIp = '';
        let i = 10;
        while (i < Math.min(70, len + 8) && msg[i] !== 0) {
          ourIp += String.fromCharCode(msg[i]);
          i++;
        }
        const ourPort = msg.readUInt16BE(68);
        this.sendVoiceOp(VOICE_WS_OPCODES.SelectProtocol, {
          protocol: 'udp',
          data: {
            address: ourIp,
            port: ourPort,
            mode: 'xsalsa20_poly1305',
          },
        });
        onReady();
      });
    });
  }

  /**
   * Play a stream of raw Opus packets
   * Uses the same queue and 20ms pacing as play(). Use this for local files (MP3 → PCM → Opus) or other Opus sources.
   */
  playOpus(stream: NodeJS.ReadableStream): void {
    this.stop();
    this._playing = true;
    this.currentStream = stream as { destroy?: () => void };
    this.audioPacketQueue = [];
    this.sendVoiceOp(VOICE_WS_OPCODES.Speaking, { speaking: 1, delay: 0 });

    const stopPacing = () => {
      if (this.pacingInterval) {
        clearInterval(this.pacingInterval);
        this.pacingInterval = null;
      }
    };
    this.pacingInterval = setInterval(() => {
      const packet = this.audioPacketQueue.shift();
      if (packet && this.secretKey && this.udpSocket) this.sendAudioFrame(packet);
      if (this.audioPacketQueue.length === 0 && !this._playing) stopPacing();
    }, AUDIO_FRAME_INTERVAL_MS);

    stream.on('data', (chunk: Buffer) => {
      if (!this._playing) return;
      if (Buffer.isBuffer(chunk) && chunk.length > 0) this.audioPacketQueue.push(chunk);
    });
    stream.on('error', (err: Error) => {
      this._playing = false;
      this.currentStream = null;
      stopPacing();
      this.emit('error', err);
    });
    stream.on('end', () => {
      this._playing = false;
      this.currentStream = null;
      if (this.audioPacketQueue.length === 0) stopPacing();
    });
  }

  /**
   * Play a direct WebM/Opus URL or stream. Fetches the URL (if string), demuxes with prism-media WebmDemuxer,
   * and sends Opus packets to the voice connection. No FFmpeg or encoding; input must be WebM with Opus.
   */
  async play(urlOrStream: string | NodeJS.ReadableStream): Promise<void> {
    this.stop();

    let inputStream: NodeJS.ReadableStream;
    if (typeof urlOrStream === 'string') {
      try {
        const response = await fetch(urlOrStream);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!response.body) throw new Error('No response body');
        inputStream = Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        this.emit('error', err);
        return;
      }
    } else {
      inputStream = urlOrStream;
    }

    const demuxer = new opus.WebmDemuxer();
    (inputStream as NodeJS.ReadableStream).pipe(demuxer);

    this._playing = true;
    this.currentStream = demuxer;
    this.audioPacketQueue = [];
    this.sendVoiceOp(VOICE_WS_OPCODES.Speaking, { speaking: 1, delay: 0 });

    const stopPacing = () => {
      if (this.pacingInterval) {
        clearInterval(this.pacingInterval);
        this.pacingInterval = null;
      }
    };
    this.pacingInterval = setInterval(() => {
      const packet = this.audioPacketQueue.shift();
      if (packet && this.secretKey && this.udpSocket) this.sendAudioFrame(packet);
      if (this.audioPacketQueue.length === 0 && !this._playing) stopPacing();
    }, AUDIO_FRAME_INTERVAL_MS);

    demuxer.on('data', (chunk: Buffer) => {
      if (!this._playing) return;
      if (Buffer.isBuffer(chunk) && chunk.length > 0) this.audioPacketQueue.push(chunk);
    });
    demuxer.on('error', (err: Error) => {
      this._playing = false;
      this.currentStream = null;
      stopPacing();
      this.emit('error', err);
    });
    demuxer.on('end', () => {
      this._playing = false;
      this.currentStream = null;
      if (this.audioPacketQueue.length === 0) stopPacing();
    });
  }

  private sendAudioFrame(opusPayload: Buffer): void {
    if (!this.udpSocket || !this.secretKey) return;
    const rtpHeader = Buffer.alloc(12);
    rtpHeader[0] = 0x80;
    rtpHeader[1] = 0x78;
    rtpHeader.writeUInt16BE(this.sequence++, 2);
    rtpHeader.writeUInt32BE(this.timestamp, 4);
    rtpHeader.writeUInt32BE(this.ssrc, 8);
    this.timestamp += OPUS_FRAME_TICKS;
    const nonce = Buffer.alloc(24);
    rtpHeader.copy(nonce, 0, 0, 12);
    const encrypted = nacl.secretbox(opusPayload, new Uint8Array(nonce), this.secretKey);
    const packet = Buffer.concat([rtpHeader, Buffer.from(encrypted)]);
    if (this.remoteUdpPort && this.remoteUdpAddress && this.udpSocket) {
      this.udpSocket.send(packet, 0, packet.length, this.remoteUdpPort, this.remoteUdpAddress);
    }
  }

  /** Stop playback and clear the queue. */
  stop(): void {
    this._playing = false;
    this.audioPacketQueue = [];
    if (this.pacingInterval) {
      clearInterval(this.pacingInterval);
      this.pacingInterval = null;
    }
    if (this.currentStream) {
      if (typeof this.currentStream.destroy === 'function') this.currentStream.destroy();
      this.currentStream = null;
    }
  }

  /** Disconnect from voice (closes WebSocket and UDP). */
  disconnect(): void {
    this._destroyed = true;
    this.stop();
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.voiceWs) {
      this.voiceWs.close();
      this.voiceWs = null;
    }
    if (this.udpSocket) {
      this.udpSocket.close();
      this.udpSocket = null;
    }
    this.emit('disconnect');
  }

  /** Disconnect and remove all listeners. */
  destroy(): void {
    if (this.currentStream) {
      if (typeof this.currentStream.destroy === 'function') this.currentStream.destroy();
      this.currentStream = null;
    }
    this.disconnect();
    this.removeAllListeners();
  }
}
