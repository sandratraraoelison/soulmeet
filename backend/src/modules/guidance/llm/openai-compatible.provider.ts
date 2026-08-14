import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmException } from './llm.exception';
import { LlmCompletionOptions, LlmMessage, LlmProvider, LlmResponse } from './llm.types';
import { responseLines } from './stream-parser';

@Injectable()
export class OpenAiCompatibleProvider implements LlmProvider {
  readonly name: string;
  readonly model: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly defaultMaxTokens: number;
  private readonly thinkingEnabled: boolean;

  constructor(config: ConfigService) {
    this.name = config.get<string>('LLM_PROVIDER', 'deepseek').toLowerCase();
    this.baseUrl = config.get<string>('LLM_BASE_URL', 'https://api.deepseek.com').replace(/\/$/, '');
    this.apiKey = config.get<string>('LLM_API_KEY', '');
    this.model = config.get<string>('LLM_MODEL', 'deepseek-v4-flash');
    this.timeoutMs = config.get<number>('LLM_TIMEOUT_MS', 60_000);
    this.defaultMaxTokens = config.get<number>('LLM_DEFAULT_MAX_TOKENS', 1200);
    this.thinkingEnabled = config.get<boolean>('LLM_THINKING_ENABLED', false);
  }

  private async request(messages: LlmMessage[], stream: boolean, options?: LlmCompletionOptions): Promise<Response> {
    if (!this.apiKey) throw new LlmException('LLM_API_KEY_MISSING', 'The remote AI provider is not configured');
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream,
          ...(options?.jsonSchema ? { response_format: { type: 'json_schema', json_schema: { name: 'soulprint_extraction', strict: true, schema: options.jsonSchema } } } : options?.json ? { response_format: { type: 'json_object' } } : {}),
          max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
          ...(this.name === 'deepseek' ? { thinking: { type: this.thinkingEnabled ? 'enabled' : 'disabled' } } : {}),
          ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!response.ok) throw new LlmException('LLM_UPSTREAM_ERROR', `AI provider returned HTTP ${response.status}`);
      return response;
    } catch (error) {
      if (error instanceof LlmException) throw error;
      throw new LlmException('LLM_UNAVAILABLE', 'The remote AI provider is unavailable');
    }
  }

  async complete(messages: LlmMessage[], options?: LlmCompletionOptions): Promise<LlmResponse> {
    const data = (await (await this.request(messages, false, options)).json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new LlmException('LLM_INVALID_RESPONSE', 'The AI provider returned an empty response');
    return { content, provider: this.name, model: this.model };
  }

  async *stream(messages: LlmMessage[], options?: LlmCompletionOptions): AsyncIterable<string> {
    for await (const line of responseLines(await this.request(messages, true, options))) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return;
      const data = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
      const token = data.choices?.[0]?.delta?.content;
      if (token) yield token;
    }
  }
}
