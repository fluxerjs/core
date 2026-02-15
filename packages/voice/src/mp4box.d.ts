declare module 'mp4box' {
  export interface MP4File {
    onReady?: (info: { tracks?: Array<{ id: number; type: string; codec: string; video?: { width: number; height: number }; timescale?: number }> }) => void;
    onError?: (e: Error) => void;
    onSamples?: (trackId: number, user: unknown, samples: Array<{ data: ArrayBuffer; is_sync?: boolean; is_rap?: boolean; timescale: number; dts: number; duration: number }>) => void;
    appendBuffer(data: ArrayBuffer): number;
    flush(): void;
    setExtractionOptions(trackId: number, user: unknown, options: { nbSamples?: number }): void;
    start(): void;
  }

  export function createFile(): MP4File;
}
