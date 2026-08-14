import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLM_PROVIDER } from '../guidance/llm/llm.types';
import { OllamaProvider } from '../guidance/llm/ollama.provider';
import { OpenAiCompatibleProvider } from '../guidance/llm/openai-compatible.provider';
import { ResilientLlmProvider } from '../guidance/llm/resilient-llm.provider';
import { ConcurrencyLimitedLlmProvider } from '../guidance/llm/concurrency-limited-llm.provider';
import { CachedLlmProvider } from '../guidance/llm/cached-llm.provider';

@Global()
@Module({
  providers: [
    OllamaProvider,
    OpenAiCompatibleProvider,
    {
      provide: LLM_PROVIDER,
      inject: [ConfigService, OllamaProvider, OpenAiCompatibleProvider],
      useFactory: (config: ConfigService, ollama: OllamaProvider, compatible: OpenAiCompatibleProvider) => {
        const wantsRemote = config.get<string>('LLM_PROVIDER', 'deepseek').toLowerCase() !== 'ollama';
        const primary = wantsRemote && config.get<string>('LLM_API_KEY', '').trim() ? compatible : ollama;
        const resilient = new ResilientLlmProvider(primary, config);
        const limited = new ConcurrencyLimitedLlmProvider(resilient, config);
        return new CachedLlmProvider(limited, config);
      },
    },
  ],
  exports: [LLM_PROVIDER],
})
export class LlmModule {}
