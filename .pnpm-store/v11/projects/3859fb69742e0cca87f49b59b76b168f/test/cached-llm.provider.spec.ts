import { ConfigService } from '@nestjs/config';
import { CachedLlmProvider } from '../src/modules/guidance/llm/cached-llm.provider';

describe('CachedLlmProvider', () => {
  const response = { content: 'cached', provider: 'deepseek', model: 'deepseek-chat' };
  it('coalesces concurrent calls and reuses a completed response', async () => {
    const delegate = { name: 'deepseek', model: 'deepseek-chat', complete: jest.fn(async () => response), stream: jest.fn() };
    const provider = new CachedLlmProvider(delegate as never, new ConfigService());
    const messages = [{ role: 'user' as const, content: 'same prompt' }];
    await Promise.all([provider.complete(messages), provider.complete(messages)]);
    await provider.complete(messages);
    expect(delegate.complete).toHaveBeenCalledTimes(1);
  });
  it('supports opting out for regenerated answers', async () => {
    const delegate = { name: 'deepseek', model: 'deepseek-chat', complete: jest.fn(async () => response), stream: jest.fn() };
    const provider = new CachedLlmProvider(delegate as never, new ConfigService());
    const messages = [{ role: 'user' as const, content: 'fresh prompt' }];
    await provider.complete(messages, { cache: false });
    await provider.complete(messages, { cache: false });
    expect(delegate.complete).toHaveBeenCalledTimes(2);
  });
});
