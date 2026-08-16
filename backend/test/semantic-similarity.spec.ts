import { semanticSimilarity } from '../src/modules/users/semantic-similarity.util';

describe('semantic matchmaking similarity', () => {
  it('recognizes bilingual expressions with the same meaning', () => {
    expect(semanticSimilarity('Je cherche une relation durable', 'Looking for a committed long-term relationship').score).toBeGreaterThan(0.3);
    expect(semanticSimilarity('Voyager et explorer le monde', 'Adventure and travelling').score).toBeGreaterThan(0.3);
  });

  it('returns a graduated score for related rather than identical text', () => {
    const related = semanticSimilarity('communication sincère et écoute', 'honest dialogue and listening').score;
    expect(related).toBeGreaterThan(0.3);
    expect(related).toBeLessThanOrEqual(1);
  });

  it('detects a semantic contradiction caused by negation', () => {
    expect(semanticSimilarity('Je veux des enfants', 'I do not want children')).toEqual({ score: 0, contradiction: true });
  });
});
