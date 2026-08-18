import { LlmException } from '../guidance/llm/llm.exception';
import {
  LlmCompletionOptions,
  LlmMessage,
  LlmProvider,
  LlmResponse,
} from '../guidance/llm/llm.types';
import { estimateTokens, LlmUsageService } from './llm-usage.service';

/** Records provider/model, latency and estimated token counts for every call. */
export class InstrumentedLlmProvider implements LlmProvider {
  readonly name: string;
  readonly model: string;

  constructor(
    private readonly provider: LlmProvider,
    private readonly usage: LlmUsageService,
  ) {
    this.name = provider.name;
    this.model = provider.model;
  }

  async complete(
    messages: LlmMessage[],
    options?: LlmCompletionOptions,
  ): Promise<LlmResponse> {
    const started = Date.now();
    const feature = options?.feature ?? 'llm';
    const userId = options?.userId;
    const inputTokens = estimateTokens(
      messages.map((message) => message.content).join('\n'),
    );
    try {
      const response = await this.provider.complete(messages, options);
      const usage = response.usage ?? {
        inputTokens,
        outputTokens: estimateTokens(response.content),
        cachedTokens: 0,
      };
      await this.usage.record({
        userId,
        feature,
        provider: response.provider,
        model: response.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cachedTokens: usage.cachedTokens,
        latencyMs: Date.now() - started,
        success: true,
      });
      return response;
    } catch (error) {
      await this.usage.record({
        userId,
        feature,
        provider: this.name,
        model: this.model,
        inputTokens,
        outputTokens: 0,
        latencyMs: Date.now() - started,
        success: false,
        errorCode:
          error instanceof LlmException
            ? error.code
            : 'LLM_UNKNOWN_ERROR',
      });
      throw error;
    }
  }

  async *stream(
    messages: LlmMessage[],
    options?: LlmCompletionOptions,
  ): AsyncIterable<string> {
    const started = Date.now();
    const feature = options?.feature ?? 'llm';
    const userId = options?.userId;
    const inputTokens = estimateTokens(
      messages.map((message) => message.content).join('\n'),
    );
    let output = '';
    try {
      for await (const token of this.provider.stream(messages, options)) {
        output += token;
        yield token;
      }
      await this.usage.record({
        userId,
        feature,
        provider: this.name,
        model: this.model,
        inputTokens,
        outputTokens: estimateTokens(output),
        latencyMs: Date.now() - started,
        success: true,
      });
    } catch (error) {
      await this.usage.record({
        userId,
        feature,
        provider: this.name,
        model: this.model,
        inputTokens,
        outputTokens: estimateTokens(output),
        latencyMs: Date.now() - started,
        success: false,
        errorCode:
          error instanceof LlmException
            ? error.code
            : 'LLM_UNKNOWN_ERROR',
      });
      throw error;
    }
  }
}
