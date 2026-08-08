import { ConfigService } from '@nestjs/config';
import { LlmException } from './llm.exception';
import { LlmCompletionOptions, LlmMessage, LlmProvider, LlmResponse } from './llm.types';

export class ResilientLlmProvider implements LlmProvider {
  readonly name: string;
  readonly model: string;
  constructor(private readonly primary: LlmProvider, private readonly config: ConfigService) {
    this.name = primary.name;
    this.model = primary.model;
  }

  async complete(messages: LlmMessage[], options?: LlmCompletionOptions): Promise<LlmResponse> {
    try {
      return await this.primary.complete(messages, options);
    } catch (error) {
      if (!(error instanceof LlmException) || !this.config.get<string>('LLM_FALLBACK_PROVIDER')) throw error;
      return this.fallbackComplete(messages, options);
    }
  }

  stream(messages: LlmMessage[]): AsyncIterable<string> {
    return this.primary.stream(messages);
  }

  private async fallbackComplete(messages: LlmMessage[], options?: LlmCompletionOptions): Promise<LlmResponse> {
    const provider = this.config.getOrThrow<string>('LLM_FALLBACK_PROVIDER').toLowerCase();
    const baseUrl = this.config.getOrThrow<string>('LLM_FALLBACK_BASE_URL').replace(/\/$/, '');
    const model = this.config.getOrThrow<string>('LLM_FALLBACK_MODEL');
    const timeout = this.config.get<number>('LLM_TIMEOUT_MS', 60_000);
    try {
      if (provider === 'ollama') {
        const response = await fetch(`${baseUrl}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model, messages, stream: false, ...(options?.jsonSchema ? { format: options.jsonSchema } : options?.json ? { format: 'json' } : {}), options: { ...(options?.maxTokens ? { num_predict: options.maxTokens } : {}), ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}) } }), signal: AbortSignal.timeout(timeout) });
        if (!response.ok) throw new Error(`HTTP_${response.status}`);
        const body = await response.json() as { message?: { content?: string } };
        if (!body.message?.content) throw new Error('EMPTY_RESPONSE');
        return { content: body.message.content.trim(), provider: `fallback:${provider}`, model };
      }
      const response = await fetch(`${baseUrl}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${this.config.getOrThrow<string>('LLM_FALLBACK_API_KEY')}` }, body: JSON.stringify({ model, messages, stream: false, ...(options?.jsonSchema ? { response_format: { type: 'json_schema', json_schema: { name: 'soulprint_extraction', strict: true, schema: options.jsonSchema } } } : options?.json ? { response_format: { type: 'json_object' } } : {}), ...(options?.maxTokens ? { max_tokens: options.maxTokens } : {}), ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}) }), signal: AbortSignal.timeout(timeout) });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      const body = await response.json() as { choices?: { message?: { content?: string } }[] };
      const content = body.choices?.[0]?.message?.content;
      if (!content) throw new Error('EMPTY_RESPONSE');
      return { content: content.trim(), provider: `fallback:${provider}`, model };
    } catch {
      throw new LlmException('LLM_FALLBACK_UNAVAILABLE', 'Both AI providers are unavailable');
    }
  }
}
