import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmException } from './llm.exception';
import {
  LlmCompletionOptions,
  LlmMessage,
  LlmProvider,
  LlmResponse,
} from './llm.types';
import { responseLines } from './stream-parser';

@Injectable()
export class OllamaProvider implements LlmProvider {
  readonly name = 'ollama';
  readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('OLLAMA_BASE_URL', 'http://localhost:11434').replace(/\/$/, '');
    this.model = config.get<string>('OLLAMA_MODEL', 'llama3.1:8b');
    this.timeoutMs = config.get<number>('LLM_TIMEOUT_MS', 60_000);
  }

  private async request(
    messages: LlmMessage[],
    stream: boolean,
    options?: LlmCompletionOptions,
  ): Promise<Response> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream,
          ...(options?.jsonSchema ? { format: options.jsonSchema } : options?.json ? { format: 'json' } : {}),
          ...(options?.maxTokens || options?.temperature !== undefined
            ? {
                options: {
                  ...(options.maxTokens ? { num_predict: options.maxTokens } : {}),
                  ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
                },
              }
            : {}),
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!response.ok) throw new LlmException('LLM_UPSTREAM_ERROR', `Ollama returned HTTP ${response.status}`);
      return response;
    } catch (error) {
      if (error instanceof LlmException) throw error;
      throw new LlmException('LLM_UNAVAILABLE', 'The local AI provider is unavailable');
    }
  }

  async complete(
    messages: LlmMessage[],
    options?: LlmCompletionOptions,
  ): Promise<LlmResponse> {
    const data = (await (
      await this.request(messages, false, options)
    ).json()) as { message?: { content?: string } };
    const content = data.message?.content?.trim();
    if (!content) throw new LlmException('LLM_INVALID_RESPONSE', 'The AI provider returned an empty response');
    return { content, provider: this.name, model: this.model };
  }

  async *stream(messages: LlmMessage[]): AsyncIterable<string> {
    for await (const line of responseLines(await this.request(messages, true))) {
      const data = JSON.parse(line) as { message?: { content?: string }; error?: string };
      if (data.error) throw new LlmException('LLM_UPSTREAM_ERROR', data.error);
      if (data.message?.content) yield data.message.content;
    }
  }
}
