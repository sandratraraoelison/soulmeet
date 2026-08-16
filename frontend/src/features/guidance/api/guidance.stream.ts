import { apiClient } from '@/api/client';
import { clearGenerationController, replaceGenerationController } from './guidance.api';
import type { GuidanceMessage, SendGuidanceMessageInput } from '../types/guidance.types';

type StreamHandlers = {
  onUserMessage?: (message: GuidanceMessage) => void;
  onToken: (token: string) => void;
  onComplete: (message: GuidanceMessage) => void;
};

export async function streamGuidanceMessage(
  conversationId: string,
  input: SendGuidanceMessageInput,
  handlers: StreamHandlers,
): Promise<void> {
  const controller = replaceGenerationController(conversationId);
  let consumed = 0;
  const process = (text: string) => {
    const complete = text.slice(consumed).split('\n\n');
    const remainder = complete.pop() ?? '';
    consumed = text.length - remainder.length;
    for (const block of complete) {
      const event = block.match(/^event:\s*(.+)$/m)?.[1];
      const raw = block.match(/^data:\s*(.+)$/m)?.[1];
      if (!event || !raw) continue;
      const data = JSON.parse(raw) as GuidanceMessage | string | { message?: string };
      if (event === 'message') handlers.onUserMessage?.(data as GuidanceMessage);
      if (event === 'token') handlers.onToken(data as string);
      if (event === 'complete') handlers.onComplete(data as GuidanceMessage);
      if (event === 'error') throw new Error((data as { message?: string }).message ?? 'Streaming failed.');
    }
  };
  try {
    const response = await apiClient.post<string>(
      `/guidance/conversations/${conversationId}/messages/stream`,
      { content: input.content },
      {
        signal: controller.signal,
        responseType: 'text',
        timeout: 90_000,
        onDownloadProgress: (progress) => {
          const target = progress.event?.currentTarget as { responseText?: string } | undefined;
          if (target?.responseText) process(target.responseText);
        },
      },
    );
    if (typeof response.data === 'string') process(`${response.data}\n\n`);
  } finally {
    clearGenerationController(conversationId, controller);
  }
}
