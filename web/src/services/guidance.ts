import { api, json } from './api';
import type { Coach, GuidanceConversation, GuidanceMessage } from '@/types';

export type GuidanceMessagePage = { messages: GuidanceMessage[]; nextCursor: string | null };

export const guidanceService = {
  coach: () => api<Coach>('/coach'),
  suggestion: () => api<{ message: string }>('/guidance/suggestion'),
  activeConversation: () =>
    api<GuidanceConversation>(
      '/guidance/conversations',
      json('POST', { title: 'Coach conversation' }),
    ),
  messages: (conversationId: string, cursor?: string) =>
    api<GuidanceMessagePage>(
      `/guidance/conversations/${conversationId}/messages?limit=40${
        cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''
      }`,
    ),
  archive: (query = '', cursor?: string) =>
    api<GuidanceMessagePage>(`/guidance/archive?limit=50${query ? `&query=${encodeURIComponent(query)}` : ''}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`),
  deleteConversation: (conversationId: string) => api(`/guidance/conversations/${conversationId}`, { method: 'DELETE' }),
  mutateMessage: (messageId: string, method: 'POST' | 'PATCH' | 'DELETE', body = {}) =>
    api(
      `/guidance/messages/${messageId}${method === 'POST' ? '/regenerate' : ''}`,
      json(method, body),
    ),
};

export function parseSseBlock(block: string): { event: string; data: unknown } | null {
  const event = block.match(/^event:\s*(.+)$/m)?.[1]?.trim();
  const raw = block.match(/^data:\s*(.+)$/m)?.[1];
  if (!event || raw === undefined) return null;
  try {
    return { event, data: JSON.parse(raw) };
  } catch {
    return null;
  }
}

export async function streamCoachReply({
  conversationId,
  content,
  signal,
  onToken,
}: {
  conversationId: string;
  content: string;
  signal: AbortSignal;
  onToken: (token: string) => void;
}) {
  const response = await fetch(`/api/guidance-stream/${conversationId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
    signal,
  });
  if (!response.ok) throw new Error('The Coach could not reply.');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('The Coach response could not be streamed.');
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';
    for (const block of blocks) {
      const item = parseSseBlock(block);
      if (item?.event === 'token' && typeof item.data === 'string') onToken(item.data);
      if (item?.event === 'error') throw new Error('The Coach could not complete the reply.');
    }
  }
}
