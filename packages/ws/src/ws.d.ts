declare module 'ws' {
  class WebSocket {
    constructor(url: string);
    send(data: string | ArrayBufferLike): void;
    close(code?: number): void;
    readyState: number;
    on(event: string, cb: (data?: unknown) => void): this;
  }
  export = WebSocket;
}
