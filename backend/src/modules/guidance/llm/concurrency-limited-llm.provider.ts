import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmException } from './llm.exception';
import { LlmCompletionOptions, LlmMessage, LlmProvider, LlmResponse } from './llm.types';

type Waiter = {
  resolve: () => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

/** Bounds upstream pressure while allowing user-facing requests to pass background work. */
export class ConcurrencyLimitedLlmProvider implements LlmProvider {
  readonly name: string;
  readonly model: string;
  private active = 0;
  private readonly interactive: Waiter[] = [];
  private readonly background: Waiter[] = [];
  private readonly concurrency: number;
  private readonly maxQueue: number;
  private readonly queueTimeoutMs: number;
  private readonly interactiveBurstLimit: number;
  private interactiveBurst = 0;

  constructor(private readonly provider: LlmProvider, config: ConfigService) {
    this.name = provider.name;
    this.model = provider.model;
    this.concurrency = config.get<number>('LLM_MAX_CONCURRENCY', 12);
    this.maxQueue = config.get<number>('LLM_MAX_QUEUE_SIZE', 100);
    this.queueTimeoutMs = config.get<number>('LLM_QUEUE_TIMEOUT_MS', 30_000);
    this.interactiveBurstLimit = config.get<number>('LLM_INTERACTIVE_BURST', 8);
  }

  async complete(messages: LlmMessage[], options?: LlmCompletionOptions): Promise<LlmResponse> {
    await this.acquire(options?.priority ?? 'interactive');
    try { return await this.provider.complete(messages, options); }
    finally { this.release(); }
  }

  async *stream(messages: LlmMessage[], options?: LlmCompletionOptions): AsyncIterable<string> {
    await this.acquire(options?.priority ?? 'interactive');
    try { yield* this.provider.stream(messages, options); }
    finally { this.release(); }
  }

  private acquire(priority: 'interactive' | 'background'): Promise<void> {
    if (this.active < this.concurrency) {
      this.active++;
      return Promise.resolve();
    }
    if (this.interactive.length + this.background.length >= this.maxQueue)
      return Promise.reject(new LlmException('LLM_QUEUE_FULL', 'The coach is temporarily at capacity', HttpStatus.SERVICE_UNAVAILABLE));
    return new Promise<void>((resolve, reject) => {
      const queue = priority === 'interactive' ? this.interactive : this.background;
      const waiter: Waiter = {
        resolve,
        reject,
        timer: setTimeout(() => {
          const index = queue.indexOf(waiter);
          if (index >= 0) queue.splice(index, 1);
          reject(new LlmException('LLM_QUEUE_TIMEOUT', 'The coach took too long to become available', HttpStatus.SERVICE_UNAVAILABLE));
        }, this.queueTimeoutMs),
      };
      queue.push(waiter);
    });
  }

  private release() {
    const serveBackground = this.background.length > 0 &&
      (this.interactive.length === 0 || this.interactiveBurst >= this.interactiveBurstLimit);
    const waiter = serveBackground ? this.background.shift() : this.interactive.shift() ?? this.background.shift();
    if (waiter) {
      this.interactiveBurst = serveBackground ? 0 : this.interactiveBurst + 1;
      clearTimeout(waiter.timer);
      waiter.resolve();
      return;
    }
    this.active--;
  }
}
