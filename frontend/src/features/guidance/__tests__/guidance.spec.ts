import { GUIDANCE_SUGGESTIONS } from '../constants/guidance.constants';
import { guidanceKeys } from '../api/guidance.query-keys';

describe('Guidance configuration', () => {
  it('keeps all required suggestions centralized in English', () => {
    expect(GUIDANCE_SUGGESTIONS).toHaveLength(7);
    expect(GUIDANCE_SUGGESTIONS.map((item) => item.id)).toEqual([
      'write-message', 'analyze-conversation', 'before-conversation', 'after-conversation',
      'prepare-date', 'relationship-advice', 'emotional-support',
    ]);
    for (const suggestion of GUIDANCE_SUGGESTIONS) {
      expect(suggestion.title).toBeTruthy();
      expect(suggestion.description).toMatch(/[.!]$/);
      expect(suggestion.starter).toMatch(/[.!]$/);
    }
  });

  it('creates targeted hierarchical query keys', () => {
    expect(guidanceKeys.messages('conversation-id')).toEqual([
      'guidance', 'conversation', 'conversation-id', 'messages',
    ]);
    expect(guidanceKeys.conversationList({ status: 'ACTIVE' })).toEqual([
      'guidance', 'conversations', { status: 'ACTIVE' },
    ]);
  });
});
