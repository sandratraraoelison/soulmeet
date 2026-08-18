const baseUrl = (process.env.BASE_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');
const runId = (process.env.RUN_ID || new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)).replace(/[^a-zA-Z0-9-]/g, '-');
const password = process.env.LOAD_TEST_PASSWORD || 'Soulmeet-load-2026!';

async function request(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${text.slice(0, 500)}`);
  return data;
}

async function createUser(label, profile, entries) {
  const session = await request('/auth/register', {
    method: 'POST',
    body: { email: `semantic-${runId}-${label}@soulmeet.test`, password, firstName: profile.firstName, birthDate: profile.birthDate, gender: profile.gender, country: profile.country, location: profile.city },
  });
  const me = await request('/auth/me', { token: session.accessToken });
  await request('/profile', { token: session.accessToken, method: 'PUT', body: profile });
  for (const entry of entries) {
    const created = await request('/soulprint/entries', { token: session.accessToken, method: 'POST', body: { ...entry, visibility: 'MATCHING_ALLOWED', sensitivity: 'NORMAL', importance: 80, matchingWeight: 90 } });
    await request(`/soulprint/entries/${created.id}/visibility`, { token: session.accessToken, method: 'PATCH', body: { visibility: 'MATCHING_ALLOWED' } });
  }
  return { token: session.accessToken, id: me.id };
}

const sharedMarker = `semantic-${runId}-slow-travel`;
const first = await createUser('a', {
  firstName: 'Semantic A', birthDate: '1994-05-12', gender: 'NON_GENDERED', sexualOrientation: 'PANSEXUAL', country: 'France', city: 'Paris', interestedInGender: 'NON_GENDERED',
}, [
  { category: 'CORE_VALUE', key: `${sharedMarker}-honesty`, value: 'Je valorise une communication honnête, calme et directe.' },
  { category: 'INTEREST', key: `${sharedMarker}-travel`, value: 'J’aime voyager lentement pour découvrir les cultures locales.' },
  { category: 'DEAL_BREAKER', key: `${sharedMarker}-no-smoking`, value: 'Je ne peux pas construire une relation avec une personne qui fume ; le tabagisme est un critère éliminatoire pour moi.' },
]);
const second = await createUser('b', {
  firstName: 'Semantic B', birthDate: '1992-09-21', gender: 'NON_GENDERED', sexualOrientation: 'PANSEXUAL', country: 'France', city: 'Lyon', interestedInGender: 'NON_GENDERED',
}, [
  { category: 'CORE_VALUE', key: `${sharedMarker}-candor`, value: 'I value candid, peaceful conversations, including during disagreements.' },
  { category: 'INTEREST', key: `${sharedMarker}-local-culture`, value: 'I prefer slow travel and learning how local people live.' },
  { category: 'HABIT', key: `${sharedMarker}-smoking`, value: 'I smoke cigarettes every day and I do not intend to stop.' },
]);

const started = performance.now();
const matches = await request('/users/matches', { token: first.token });
const target = matches.find((match) => match.userId === second.id);
const result = {
  runId,
  durationMs: Math.round(performance.now() - started),
  candidateFound: Boolean(target),
  semanticApplied: Boolean(target?.semanticModel && Number.isFinite(target?.semanticScore)),
  target: target ? {
    userId: target.userId,
    score: target.score,
    semanticScore: target.semanticScore,
    semanticConfidence: target.semanticConfidence,
    semanticModel: target.semanticModel,
    semanticAnalysis: target.semanticAnalysis,
    reasons: target.reasons,
  } : null,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.semanticApplied) process.exitCode = 1;
