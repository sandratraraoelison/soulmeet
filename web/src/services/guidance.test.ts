import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseSseBlock, streamCoachReply } from './guidance';

describe('guidance SSE parser', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('parses token events', () => {
    expect(parseSseBlock('event: token\ndata: "hello"')).toEqual({ event: 'token', data: 'hello' });
  });

  it('parses error events', () => {
    expect(parseSseBlock('event: error\ndata: {}')).toEqual({ event: 'error', data: {} });
  });

  it('ignores malformed and incomplete events safely', () => {
    expect(parseSseBlock('data: "hello"')).toBeNull();
    expect(parseSseBlock('event: token\ndata: {broken')).toBeNull();
  });
});

describe('streamCoachReply', () => {
  afterEach(() => vi.unstubAllGlobals());

  function sseResponse(chunks: string[]) {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    });
    return new Response(body, { status: 200 });
  }

  it('accumulates tokens and surfaces stream errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        sseResponse([
          'event: token\ndata: "Hello"\n\n',
          'event: token\ndata: " world"\n\n',
          'event: error\ndata: {}\n\n',
        ]),
      ),
    );
    const tokens: string[] = [];
    const run = streamCoachReply({
      conversationId: 'c1',
      content: 'hi',
      signal: new AbortController().signal,
      onToken: (token) => tokens.push(token),
    });
    await expect(run).rejects.toThrow('The Coach could not complete the reply.');
    expect(tokens).toEqual(['Hello', ' world']);
  });

  it('accumulates tokens across chunk boundaries', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        sseResponse(['event: token\nda', 'ta: "hi"', '\n\n', 'event: token\ndata: "!"\n\n']),
      ),
    );
    const tokens: string[] = [];
    await streamCoachReply({
      conversationId: 'c1',
      content: 'hi',
      signal: new AbortController().signal,
      onToken: (token) => tokens.push(token),
    });
    expect(tokens).toEqual(['hi', '!']);
  });
});