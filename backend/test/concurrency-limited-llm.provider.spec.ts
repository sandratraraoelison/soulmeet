import { ConfigService } from '@nestjs/config';
import { ConcurrencyLimitedLlmProvider } from '../src/modules/guidance/llm/concurrency-limited-llm.provider';

describe('ConcurrencyLimitedLlmProvider', () => {
  const response = { content: 'ok', provider: 'test', model: 'test' };

  it('limits concurrency and prioritizes interactive requests', async () => {
    const releases: Array<() => void> = [];
    const order: string[] = [];
    const delegate = {
      name: 'test', model: 'test',
      complete: jest.fn((messages: { content: string }[]) => new Promise<typeof response>((resolve) => {
        order.push(messages[0].content);
        releases.push(() => resolve(response));
      })),
      stream: jest.fn(),
    };
    const limiter = new ConcurrencyLimitedLlmProvider(delegate as never, new ConfigService({
      LLM_MAX_CONCURRENCY: 1, LLM_MAX_QUEUE_SIZE: 10, LLM_QUEUE_TIMEOUT_MS: 1000,
    }));

    const first = limiter.complete([{ role: 'user', content: 'first' }]);
    const background = limiter.complete([{ role: 'user', content: 'background' }], { priority: 'background' });
    const interactive = limiter.complete([{ role: 'user', content: 'interactive' }], { priority: 'interactive' });
    await Promise.resolve();
    releases.shift()?.();
    await first;
    await Promise.resolve();
    expect(order).toEqual(['first', 'interactive']);
    releases.shift()?.();
    await interactive;
    await Promise.resolve();
    releases.shift()?.();
    await background;
    expect(order).toEqual(['first', 'interactive', 'background']);
  });

  it('rejects excess queued requests instead of exhausting memory', async () => {
    const delegate = {
      name: 'test', model: 'test',
      complete: jest.fn(() => new Promise(() => undefined)),
      stream: jest.fn(),
    };
    const limiter = new ConcurrencyLimitedLlmProvider(delegate as never, new ConfigService({
      LLM_MAX_CONCURRENCY: 1, LLM_MAX_QUEUE_SIZE: 1, LLM_QUEUE_TIMEOUT_MS: 20,
    }));
    void limiter.complete([{ role: 'user', content: 'active' }]);
    const queued = limiter.complete([{ role: 'user', content: 'queued' }]);
    await expect(limiter.complete([{ role: 'user', content: 'rejected' }])).rejects.toMatchObject({ code: 'LLM_QUEUE_FULL' });
    await expect(queued).rejects.toMatchObject({ code: 'LLM_QUEUE_TIMEOUT' });
  });
});
