import { createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { LlmCompletionOptions, LlmMessage, LlmProvider, LlmResponse } from './llm.types';

type CacheEntry = { expiresAt: number; response: LlmResponse };

/** Small process-local LRU cache that also coalesces identical requests in flight. */
export class CachedLlmProvider implements LlmProvider {
  readonly name: string;
  readonly model: string;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Promise<LlmResponse>>();
  private readonly enabled: boolean;
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(private readonly provider: LlmProvider, config: ConfigService) {
    this.name = provider.name;
    this.model = provider.model;
    this.enabled = config.get<boolean>('LLM_CACHE_ENABLED', true);
    this.ttlMs = config.get<number>('LLM_CACHE_TTL_SECONDS', 300) * 1000;
    this.maxEntries = config.get<number>('LLM_CACHE_MAX_ENTRIES', 500);
  }

  complete(messages: LlmMessage[], options?: LlmCompletionOptions): Promise<LlmResponse> {
    if (!this.enabled || options?.cache === false) return this.provider.complete(messages, options);
    const key = this.key(messages, options);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      this.cache.delete(key);
      this.cache.set(key, cached);
      return Promise.resolve(cached.response);
    }
    if (cached) this.cache.delete(key);
    const pending = this.inFlight.get(key);
    if (pending) return pending;
    const request = this.provider.complete(messages, options).then((response) => {
      this.cache.set(key, { response, expiresAt: Date.now() + this.ttlMs });
      while (this.cache.size > this.maxEntries) {
        const oldest = this.cache.keys().next().value as string | undefined;
        if (oldest === undefined) break;
        this.cache.delete(oldest);
      }
      return response;
    }).finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, request);
    return request;
  }

  stream(messages: LlmMessage[], options?: LlmCompletionOptions): AsyncIterable<string> {
    return this.provider.stream(messages, options);
  }

  private key(messages: LlmMessage[], options?: LlmCompletionOptions): string {
    const cacheOptions = options ? { ...options, priority: undefined, cache: undefined } : undefined;
    return createHash('sha256').update(JSON.stringify({ provider: this.name, model: this.model, messages, options: cacheOptions })).digest('hex');
  }
}
