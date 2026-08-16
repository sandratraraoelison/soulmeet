import { SemanticMatchService } from '../src/modules/users/semantic-match.service';

describe('SemanticMatchService', () => {
  const entry = { id: 'entry-1', category: 'CORE_VALUE', key: 'support', normalizedValue: null, value: 'Being present in difficult times', matchingWeight: 90, semanticSourceHash: null };

  it('stays disabled and makes no provider call while the API key is missing', async () => {
    const llm = { complete: jest.fn() };
    const config = { get: (key: string, fallback: unknown) => key === 'SEMANTIC_MATCHING_ENABLED' ? true : key === 'LLM_API_KEY' ? '' : fallback };
    const service = new SemanticMatchService({} as any, config as any, llm as any);
    await expect(service.evaluate('user-1', [entry], [{ id: 'candidate-1', entries: [entry], baseScore: 70 }])).resolves.toBeNull();
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it('validates, persists and returns structured DeepSeek evaluations', async () => {
    const prisma = { soulprintEntry: { update: jest.fn().mockResolvedValue({}) } };
    const config = { get: (key: string, fallback: unknown) => ({ SEMANTIC_MATCHING_ENABLED: true, LLM_API_KEY: 'test-key', SEMANTIC_MATCHING_PROMPT_VERSION: 'v1' } as Record<string, unknown>)[key] ?? fallback };
    const llm = { complete: jest.fn().mockResolvedValue({ model: 'deepseek-test', content: JSON.stringify({ normalizedEntries: [{ id: 'entry-1', concept: 'EMOTIONAL_SUPPORT', intent: 'OFFER_SUPPORT', polarity: 'POSITIVE', topics: ['empathy'], normalizedMeaning: 'Offers emotional support', confidence: 0.9 }], matches: [{ candidateId: 'candidate-1', semanticScore: 86, confidence: 0.91, compatibleConcepts: ['EMOTIONAL_SUPPORT'], contradictions: [], reasons: ['Both value emotional support'] }] }) }) };
    const service = new SemanticMatchService(prisma as any, config as any, llm as any);
    const result = await service.evaluate('user-1', [entry], [{ id: 'candidate-1', entries: [], baseScore: 70 }]);
    expect(result?.get('candidate-1')).toMatchObject({ semanticScore: 86, confidence: 0.91, model: 'deepseek-test' });
    expect(prisma.soulprintEntry.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ semanticModel: 'deepseek-test', semanticPromptVersion: 'v1' }) }));
  });

  it('falls back instead of breaking matching when the provider fails', async () => {
    const config = { get: (key: string, fallback: unknown) => key === 'SEMANTIC_MATCHING_ENABLED' ? true : key === 'LLM_API_KEY' ? 'test-key' : fallback };
    const service = new SemanticMatchService({} as any, config as any, { complete: jest.fn().mockRejectedValue(new Error('offline')) } as any);
    await expect(service.evaluate('user-1', [entry], [{ id: 'candidate-1', entries: [], baseScore: 70 }])).resolves.toBeNull();
  });
});
