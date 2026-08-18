import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = (process.env.BASE_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');
const runId = (process.env.RUN_ID || new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)).replace(/[^a-zA-Z0-9-]/g, '-');
const maxUsers = Number(process.env.MAX_USERS || 10);
const minUsers = Number(process.env.MIN_USERS || 1);
const timeoutMs = Number(process.env.EXTRACTION_TIMEOUT_MS || 180_000);
const password = process.env.LOAD_TEST_PASSWORD || 'Soulmeet-load-2026!';

async function request(path, { token, method = 'GET', body, timeout = 135_000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${text.slice(0, 500)}`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function authenticate(label) {
  const account = { email: `load-${runId}-${label}@soulmeet.test`, password };
  let session;
  try {
    session = await request('/auth/register', { method: 'POST', body: { ...account, firstName: `Load ${label}`, birthDate: '1995-06-15', gender: 'NON_GENDERED', country: 'Load Test', location: 'Concurrent Lab' } });
  } catch (error) {
    if (!String(error.message).includes('-> 409:')) throw error;
    session = await request('/auth/login', { method: 'POST', body: account });
  }
  try {
    await request('/coach', { token: session.accessToken, method: 'POST', body: { name: 'Alex', gender: 'NON_GENDERED', traits: ['FRIENDLY', 'EMPATHETIC', 'DIRECT'], speakingStyle: 'warm and concise', adviceStyle: 'practical', humorLevel: 25, empathyLevel: 80, directnessLevel: 65, energyLevel: 55 } });
  } catch (error) {
    if (!String(error.message).includes('-> 409:')) throw error;
  }
  return session.accessToken;
}

async function waitForSoulprint(token, marker) {
  const started = performance.now();
  let lastStatus = 'IDLE';
  let manualFallback = false;
  let extractionWarning;
  while (performance.now() - started < timeoutMs) {
    const [status, soulprint] = await Promise.all([
      request('/soulprint/extraction-status', { token }),
      request('/soulprint', { token }),
    ]);
    lastStatus = status.status;
    if (JSON.stringify(soulprint).includes(marker)) return { latencyMs: Math.round(performance.now() - started), status: lastStatus, mode: manualFallback ? 'manual-fallback' : (lastStatus === 'PENDING' || lastStatus === 'IDLE' ? 'direct-fast-path' : 'background-worker'), ...(extractionWarning ? { warning: extractionWarning } : {}) };
    if (lastStatus === 'FAILED') throw new Error(`Soulprint extraction failed: ${status.lastErrorCode || 'unknown'}`);
    if (!manualFallback && performance.now() - started >= 15_000) {
      try {
        await request('/soulprint/extract', { token, method: 'POST', body: {}, timeout: 135_000 });
        manualFallback = true;
      } catch (error) {
        const message = String(error.message);
        if (!message.includes('SOULPRINT_EXTRACTION_ALREADY_RUNNING') && !message.includes('SOULPRINT_EXTRACTION_INVALID_RESPONSE') && !message.includes('LLM_UPSTREAM_ERROR')) throw error;
        extractionWarning = message.includes('SOULPRINT_EXTRACTION_ALREADY_RUNNING') ? extractionWarning : message;
        if (extractionWarning) manualFallback = true;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`Soulprint marker absent after ${timeoutMs} ms (last status: ${lastStatus})`);
}

async function simulate(stage, index) {
  const label = `stage-${stage}-user-${index}`;
  const marker = `soulmeet-load-${runId}-${label}`;
  const started = performance.now();
  try {
    const token = await authenticate(label);
    const conversation = await request('/guidance/conversations', { token, method: 'POST', body: { title: `Load ${runId} ${label}` } });
    const message = [
      `I enjoy ${marker}. Can you help me reflect on this durable personal interest, which is unique to this test identity?`,
      'In relationships, I value honest, calm and direct communication, mutual respect, emotional safety, curiosity, reliability and consistent effort.',
      'I am looking for a stable long-term relationship with someone who can discuss disagreements without disappearing or becoming aggressive.',
      'Travel, discovering cultures, cooking together, walking outdoors and meaningful conversations are important parts of the life I want to share.',
      'When I feel uncertain, I prefer concrete advice that remains empathetic and gives me one manageable next step instead of making assumptions for me.',
      'Please help me draft a warm first message about a spontaneous trip, then briefly explain why the message feels inviting without putting pressure on the other person.',
    ].join(' ');
    const coachStarted = performance.now();
    const coach = await request(`/guidance/conversations/${conversation.id}/messages`, { token, method: 'POST', body: { content: message } });
    const coachLatencyMs = Math.round(performance.now() - coachStarted);
    if (!coach?.message?.content?.trim()) throw new Error('Empty coach response');
    const extraction = await waitForSoulprint(token, marker);
    return { stage, index, ok: true, coachLatencyMs, extractionLatencyMs: extraction.latencyMs, extractionStatus: extraction.status, extractionMode: extraction.mode, ...(extraction.warning ? { extractionWarning: extraction.warning } : {}), totalLatencyMs: Math.round(performance.now() - started) };
  } catch (error) {
    return { stage, index, ok: false, error: String(error.message || error), totalLatencyMs: Math.round(performance.now() - started) };
  }
}

function percentile(values, percent) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil((percent / 100) * sorted.length) - 1];
}

const results = [];
for (let stage = minUsers; stage <= maxUsers; stage += 1) {
  const stageStarted = performance.now();
  const stageResults = await Promise.all(Array.from({ length: stage }, (_, index) => simulate(stage, index + 1)));
  results.push(...stageResults);
  const passed = stageResults.filter((entry) => entry.ok).length;
  process.stdout.write(`Palier ${stage}: ${passed}/${stage} réussis en ${Math.round(performance.now() - stageStarted)} ms\n`);
  for (const failure of stageResults.filter((entry) => !entry.ok)) process.stdout.write(`  Échec utilisateur ${failure.index}: ${failure.error}\n`);
}

const successes = results.filter((entry) => entry.ok);
const report = {
  runId,
  baseUrl,
  stages: `${minUsers}..${maxUsers}`,
  simulatedUsers: results.length,
  passed: successes.length,
  failed: results.length - successes.length,
  successRate: results.length ? successes.length / results.length : 0,
  coachLatencyMs: { p50: percentile(successes.map((entry) => entry.coachLatencyMs), 50), p95: percentile(successes.map((entry) => entry.coachLatencyMs), 95), max: Math.max(0, ...successes.map((entry) => entry.coachLatencyMs)) },
  extractionLatencyMs: { p50: percentile(successes.map((entry) => entry.extractionLatencyMs), 50), p95: percentile(successes.map((entry) => entry.extractionLatencyMs), 95), max: Math.max(0, ...successes.map((entry) => entry.extractionLatencyMs)) },
  results,
};
await mkdir(new URL('./load-results/', import.meta.url), { recursive: true });
const reportUrl = new URL(`./load-results/guidance-soulprint-node-${runId}.json`, import.meta.url);
await writeFile(reportUrl, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({ ...report, results: undefined }, null, 2)}\nRapport: ${reportUrl.pathname}\n`);
if (report.failed) process.exitCode = 1;
