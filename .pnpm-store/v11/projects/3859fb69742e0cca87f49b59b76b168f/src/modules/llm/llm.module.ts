import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLM_PROVIDER } from '../guidance/llm/llm.types';
import { OllamaProvider } from '../guidance/llm/ollama.provider';
import { OpenAiCompatibleProvider } from '../guidance/llm/openai-compatible.provider';
import { ResilientLlmProvider } from '../guidance/llm/resilient-llm.provider';

@Global()
@Module({
  providers: [
    OllamaProvider,
    OpenAiCompatibleProvider,
    {
      provide: LLM_PROVIDER,
      inject: [ConfigService, OllamaProvider, OpenAiCompatibleProvider],
      useFactory: (config: ConfigService, ollama: OllamaProvider, compatible: OpenAiCompatibleProvider) => {
        const primary = config.get<string>('LLM_PROVIDER', 'ollama').toLowerCase() === 'ollama' ? ollama : compatible;
        return new ResilientLlmProvider(primary, config);
      },
    },
  ],
  exports: [LLM_PROVIDER],
})
export class LlmModule {}
