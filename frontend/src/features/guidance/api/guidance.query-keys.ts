export const guidanceKeys = {
  all: ['guidance'] as const,
  conversations: () => [...guidanceKeys.all, 'conversations'] as const,
  conversationList: (filters: Record<string, unknown>) => [...guidanceKeys.conversations(), filters] as const,
  conversation: (conversationId: string) => [...guidanceKeys.all, 'conversation', conversationId] as const,
  messages: (conversationId: string) => [...guidanceKeys.conversation(conversationId), 'messages'] as const,
};
