const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'be', 'de', 'des', 'du', 'et', 'for', 'in', 'is', 'la', 'le', 'les', 'of', 'pour', 'the', 'to', 'un', 'une', 'with',
  'avec', 'dans', 'est', 'je', 'qui', 'sur', 'that', 'this', 'want', 'veux', 'souhaite', 'cherche', 'looking',
]);

const NEGATIONS = new Set(['not', 'no', 'never', 'without', 'dont', 'doesnt', 'pas', 'jamais', 'sans', 'aucun', 'aucune']);

const CONCEPTS: Record<string, string[]> = {
  honesty: ['honest', 'honesty', 'sincere', 'sincerity', 'truthful', 'franc', 'franche', 'honnete', 'honnetete', 'sincere', 'sincerite'],
  loyalty: ['faithful', 'fidelity', 'loyal', 'loyalty', 'fidele', 'fidelite', 'loyaute'],
  family: ['family', 'familial', 'famille', 'relatives', 'proches'],
  children: ['baby', 'babies', 'child', 'children', 'kids', 'parenthood', 'enfant', 'enfants', 'parentalite'],
  long_term: ['committed', 'commitment', 'durable', 'engagement', 'longterm', 'marriage', 'mariage', 'relation', 'relationship', 'serious', 'serieuse', 'serieux', 'stable'],
  casual: ['casual', 'shortterm', 'sansengagement', 'ephemere', 'leger'],
  communication: ['communicate', 'communication', 'dialogue', 'discuss', 'discussion', 'ecoute', 'listen', 'listening', 'parler'],
  empathy: ['caring', 'compassion', 'compassionate', 'empathy', 'empathetic', 'empathie', 'bienveillance'],
  adventure: ['adventure', 'adventurous', 'aventure', 'exploration', 'explore', 'travel', 'travelling', 'voyage', 'voyager'],
  creativity: ['art', 'artistic', 'creative', 'creativity', 'creatif', 'creative', 'creativite', 'musique', 'music'],
  calm: ['calm', 'calme', 'peace', 'peaceful', 'paisible', 'serene', 'serenite'],
  growth: ['development', 'evolution', 'grandir', 'growth', 'progres', 'progress', 'selfimprovement'],
  independence: ['autonomie', 'autonomous', 'independence', 'independent', 'independant', 'liberte'],
  affection: ['affection', 'cuddle', 'physicaltouch', 'tendresse', 'touch'],
  quality_time: ['qualitytime', 'tempsensemble', 'presence', 'sharedtime'],
};

const CONCEPT_BY_TERM = new Map(Object.entries(CONCEPTS).flatMap(([concept, terms]) => terms.flatMap((term) => {
  const root = term.replace(/(ements?|ations?|iques?|ment|ness|ing|ed|es|s)$/i, '');
  return [[term, concept], [root, concept]] as [string, string][];
})));

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/['’]/g, '').replace(/\b(long[ -]?term|longue? duree)\b/g, ' longterm ').replace(/\b(quality time|temps de qualite)\b/g, ' qualitytime ').replace(/\b(sans engagement|short[ -]?term)\b/g, ' shortterm ');
}

function stem(token: string): string {
  return token.replace(/(ements?|ations?|iques?|ment|ness|ing|ed|es|s)$/i, '');
}

function features(value: string) {
  const normalized = normalize(value);
  const raw = normalized.split(/[^a-z0-9]+/).filter(Boolean);
  const negated = raw.some((token) => NEGATIONS.has(token));
  const terms = raw.filter((token) => !STOP_WORDS.has(token) && !NEGATIONS.has(token) && token.length > 2).map(stem);
  const concepts = terms.map((term) => CONCEPT_BY_TERM.get(term) ?? term);
  return { normalized, negated, concepts: new Set(concepts) };
}

function dice(left: Set<string>, right: Set<string>): number {
  if (!left.size || !right.size) return 0;
  let common = 0;
  for (const item of left) if (right.has(item)) common++;
  return (2 * common) / (left.size + right.size);
}

function trigrams(value: string): Set<string> {
  const compact = value.replace(/[^a-z0-9]/g, '');
  const result = new Set<string>();
  for (let index = 0; index <= compact.length - 3; index++) result.add(compact.slice(index, index + 3));
  return result;
}

export function semanticSimilarity(leftValue: string, rightValue: string): { score: number; contradiction: boolean } {
  const left = features(leftValue);
  const right = features(rightValue);
  const conceptScore = dice(left.concepts, right.concepts);
  const spellingScore = dice(trigrams(left.normalized), trigrams(right.normalized));
  const contradiction = conceptScore >= 0.45 && left.negated !== right.negated;
  if (contradiction) return { score: 0, contradiction: true };
  return { score: Math.min(1, conceptScore * 0.82 + spellingScore * 0.18), contradiction: false };
}
