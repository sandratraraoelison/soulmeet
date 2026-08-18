export type LlmRole = 'system' | 'user' | 'assistant';

export interface LlmMessage {
  role: LlmRole;
  content: string;
}

export interface LlmResponse {
  content: string;
  provider: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
  };
}

export interface LlmCompletionOptions {
  /** Disable response reuse for calls that intentionally need a fresh generation. */
  cache?: boolean;
  json?: boolean;
  jsonSchema?: Record<string, unknown>;
  maxTokens?: number;
  temperature?: number;
  priority?: 'interactive' | 'background';
  /** Usage bucket used by the LlmUsage telemetry (e.g. guidance, soulprint). */
  feature?: string;
  /** Account id recorded with the LlmUsage telemetry, if known. */
  userId?: string;
}

export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  complete(
    messages: LlmMessage[],
    options?: LlmCompletionOptions,
  ): Promise<LlmResponse>;
  stream(messages: LlmMessage[], options?: LlmCompletionOptions): AsyncIterable<string>;
}

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
