import { estimateLlmCostUsd } from '../src/modules/llm/llm-usage.service';

describe('DeepSeek usage pricing', () => {
  it('prices V4 Flash cache misses, cache hits and output tokens', () => {
    expect(estimateLlmCostUsd({
      provider: 'deepseek',
      model: 'deepseek-v4-flash',
      inputTokens: 2_000_000,
      cachedTokens: 500_000,
      outputTokens: 1_000_000,
    })).toBeCloseTo(0.4914, 8);
  });

  it('does not invent a price for unsupported providers', () => {
    expect(estimateLlmCostUsd({
      provider: 'ollama',
      model: 'llama3.1:8b',
      inputTokens: 100,
      cachedTokens: 0,
      outputTokens: 100,
    })).toBeUndefined();
  });
});
