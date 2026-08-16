import type { Response } from 'express';

export interface SseEvent<T = unknown> {
  event: string;
  data: T;
}

export function writeSseEvent(response: Response, item: SseEvent): void {
  response.write(`event: ${item.event}\ndata: ${JSON.stringify(item.data)}\n\n`);
}

export function writeSseError(response: Response, error: unknown): void {
  const payload =
    error instanceof Error
      ? { code: 'GUIDANCE_STREAM_ERROR', message: error.message }
      : { code: 'GUIDANCE_STREAM_ERROR', message: 'Streaming failed' };
  writeSseEvent(response, { event: 'error', data: payload });
}
