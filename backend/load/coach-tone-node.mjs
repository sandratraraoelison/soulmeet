const baseUrl = (process.env.BASE_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');
const runId = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
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

async function run(label, coach) {
  const session = await request('/auth/register', { method: 'POST', body: {
    email: `tone-${runId}-${label}@soulmeet.test`, password, firstName: `Tone ${label}`,
    birthDate: '1994-05-12', gender: 'NON_GENDERED', country: 'France', location: 'Paris',
  } });
  await request('/coach', { token: session.accessToken, method: 'POST', body: coach });
  const conversation = await request('/guidance/conversations', { token: session.accessToken, method: 'POST', body: { title: `Tone test ${label}` } });
  const started = performance.now();
  const response = await request(`/guidance/conversations/${conversation.id}/messages`, { token: session.accessToken, method: 'POST', body: {
    content: "La personne que je fréquente ne m'a pas répondu depuis deux jours alors qu'elle publie sur les réseaux. Je me sens rejeté et j'ai envie de lui envoyer plusieurs messages. Qu'est-ce que je devrais faire ?",
  } });
  const content = response.message.content.trim();
  return {
    label,
    traits: coach.traits,
    empathyLevel: coach.empathyLevel,
    directnessLevel: coach.directnessLevel,
    latencyMs: Math.round(performance.now() - started),
    words: content.split(/\s+/).length,
    questions: (content.match(/\?/g) || []).length,
    response: content,
  };
}

const [soft, direct] = await Promise.all([
  run('soft', { name: 'Lina', gender: 'FEMALE', traits: ['SOFT', 'EMPATHETIC', 'LESS_DIRECTIVE'], speakingStyle: 'warm, gentle and reassuring', adviceStyle: 'reflective and choice-oriented', humorLevel: 5, empathyLevel: 95, directnessLevel: 20, energyLevel: 30 }),
  run('direct', { name: 'Max', gender: 'MALE', traits: ['DIRECT', 'SERIOUS', 'MORE_DIRECTIVE'], speakingStyle: 'concise, firm and plain-spoken', adviceStyle: 'practical and action-first', humorLevel: 0, empathyLevel: 35, directnessLevel: 95, energyLevel: 55 }),
]);

console.log(JSON.stringify({ runId, samePrompt: true, soft, direct, observablyDifferent: soft.response !== direct.response }, null, 2));
