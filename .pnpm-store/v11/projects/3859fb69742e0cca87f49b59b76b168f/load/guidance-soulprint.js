import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');
const RUN_ID = (__ENV.RUN_ID || `${Date.now()}`).replace(/[^a-zA-Z0-9-]/g, '-');
const PASSWORD = __ENV.LOAD_TEST_PASSWORD || 'Soulmeet-load-2026!';
const USERS = Number(__ENV.USERS || 10);
const EXTRACTION_TIMEOUT_SECONDS = Number(__ENV.EXTRACTION_TIMEOUT_SECONDS || 90);
const POLL_INTERVAL_SECONDS = Number(__ENV.POLL_INTERVAL_SECONDS || 2);
// k6 recommends reusing response callbacks instead of allocating them per request.
const EXPECT_CREATED_OR_CONFLICT = http.expectedStatuses(201, 409);
const EXPECT_NOT_FOUND = http.expectedStatuses(404);

const coachLatency = new Trend('coach_response_duration', true);
const extractionLatency = new Trend('soulprint_extraction_duration', true);
const coachFailures = new Rate('coach_failures');
const extractionFailures = new Rate('soulprint_extraction_failures');
const isolationFailures = new Counter('soulprint_isolation_failures');

export const options = {
  scenarios: {
    concurrent_coach_users: {
      executor: 'per-vu-iterations',
      vus: USERS,
      iterations: 1,
      maxDuration: `${Math.max(180, EXTRACTION_TIMEOUT_SECONDS + 90)}s`,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
    coach_failures: ['rate<0.01'],
    soulprint_extraction_failures: ['rate<0.01'],
    soulprint_isolation_failures: ['count==0'],
    coach_response_duration: ['p(95)<15000'],
    soulprint_extraction_duration: ['p(95)<60000'],
  },
};

function jsonHeaders(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
}

function parseJson(response, label) {
  try {
    return response.json();
  } catch {
    fail(`${label} returned non-JSON (${response.status}): ${response.body}`);
  }
}

function credentials(label) {
  return {
    email: `load-${RUN_ID}-${label}@soulmeet.test`,
    password: PASSWORD,
  };
}

function authenticate(label) {
  const account = credentials(label);
  const registration = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({
      ...account,
      firstName: `Load ${label}`.slice(0, 80),
      birthDate: '1995-06-15',
      gender: 'NON_GENDERED',
      country: 'Load Test',
      location: 'Concurrent Lab',
    }),
    { ...jsonHeaders(), responseCallback: EXPECT_CREATED_OR_CONFLICT },
  );

  // Reusing RUN_ID is convenient when iterating on the script. Existing test
  // accounts log in instead of turning a harmless conflict into a failed run.
  const sessionResponse = registration.status === 409
    ? http.post(`${BASE_URL}/auth/login`, JSON.stringify(account), jsonHeaders())
    : registration;
  const authenticated = check(sessionResponse, {
    'user authenticated': (response) => response.status === 200 || response.status === 201,
  });
  if (!authenticated) fail(`Authentication failed for ${account.email}: ${sessionResponse.status} ${sessionResponse.body}`);
  const session = parseJson(sessionResponse, 'authentication');
  if (!session.accessToken) fail(`Authentication response has no accessToken for ${account.email}`);
  const token = session.accessToken;
  const coachResponse = http.post(
    `${BASE_URL}/coach`,
    JSON.stringify({
      name: 'Alex',
      gender: 'NON_GENDERED',
      traits: ['FRIENDLY', 'EMPATHETIC', 'DIRECT'],
      speakingStyle: 'warm and concise',
      adviceStyle: 'practical',
      humorLevel: 25,
      empathyLevel: 80,
      directnessLevel: 65,
      energyLevel: 55,
    }),
    { ...jsonHeaders(token), responseCallback: EXPECT_CREATED_OR_CONFLICT },
  );
  const coachReady = check(coachResponse, {
    'coach profile ready': (response) => response.status === 201 || response.status === 409,
  });
  if (!coachReady) fail(`Coach setup failed for ${account.email}: ${coachResponse.status} ${coachResponse.body}`);
  return { ...account, token };
}

function createConversation(token, label) {
  const response = http.post(
    `${BASE_URL}/guidance/conversations`,
    JSON.stringify({ title: `Concurrent load ${RUN_ID} ${label}` }),
    jsonHeaders(token),
  );
  check(response, { 'conversation created': (result) => result.status === 201 });
  const conversation = parseJson(response, 'conversation creation');
  if (!conversation.id) fail(`Conversation response has no id: ${response.body}`);
  return conversation.id;
}

function waitForSoulprint(token, ownMarker) {
  const startedAt = Date.now();
  let observedWorker = false;

  while ((Date.now() - startedAt) / 1000 < EXTRACTION_TIMEOUT_SECONDS) {
    const statusResponse = http.get(`${BASE_URL}/soulprint/extraction-status`, jsonHeaders(token));
    if (statusResponse.status === 200) {
      const extraction = parseJson(statusResponse, 'extraction status');
      observedWorker ||= extraction.status !== 'IDLE';
      if (extraction.status === 'FAILED') return { success: false, reason: extraction.lastErrorCode || 'FAILED' };
    }

    const soulprintResponse = http.get(`${BASE_URL}/soulprint`, jsonHeaders(token));
    if (soulprintResponse.status === 200) {
      const serialized = JSON.stringify(parseJson(soulprintResponse, 'Soulprint'));
      const markers = serialized.match(new RegExp(`soulmeet-load-${RUN_ID}-vu-[0-9]+`, 'g')) || [];
      const foreignMarkers = [...new Set(markers)].filter((marker) => marker !== ownMarker);
      if (foreignMarkers.length) {
        isolationFailures.add(1);
        return { success: false, reason: `foreign markers: ${foreignMarkers.join(', ')}` };
      }
      if (serialized.includes(ownMarker)) {
        return { success: true, observedWorker };
      }
    }
    sleep(POLL_INTERVAL_SECONDS);
  }
  return { success: false, reason: 'timeout' };
}

// Create two known entries once so every VU can verify object-level ownership,
// not only the isolation of the current-user Soulprint endpoint.
export function setup() {
  const first = authenticate('isolation-a');
  const second = authenticate('isolation-b');
  const create = (account, suffix) => {
    const response = http.post(
      `${BASE_URL}/soulprint/entries`,
      JSON.stringify({ category: 'OTHER', key: `isolation-${RUN_ID}-${suffix}`, value: `Private isolation probe ${RUN_ID}-${suffix}`, visibility: 'PRIVATE' }),
      { ...jsonHeaders(account.token), responseCallback: EXPECT_CREATED_OR_CONFLICT },
    );
    if (response.status === 409) {
      const list = http.get(`${BASE_URL}/soulprint/entries?category=OTHER&limit=100`, jsonHeaders(account.token));
      const page = parseJson(list, 'isolation probe lookup');
      const found = page.entries?.find((entry) => entry.key === `isolation-${RUN_ID}-${suffix}`);
      if (!found?.id) fail(`Could not recover isolation probe ${suffix}`);
      return found.id;
    }
    check(response, { 'isolation probe created': (result) => result.status === 201 });
    return parseJson(response, 'isolation probe creation').id;
  };
  return {
    isolation: {
      firstToken: first.token,
      secondToken: second.token,
      firstEntryId: create(first, 'a'),
      secondEntryId: create(second, 'b'),
    },
  };
}

export default function (data) {
  const label = `vu-${__VU}`;
  const marker = `soulmeet-load-${RUN_ID}-vu-${__VU}`;
  const account = authenticate(label);
  const conversationId = createConversation(account.token, label);

  const message = [
    `I explicitly enjoy ${marker}.`,
    `It is a durable personal interest that identifies only test user ${__VU}.`,
    'I value honest communication and I am looking for a stable long-term relationship.',
  ].join(' ');
  const coachStartedAt = Date.now();
  const coachResponse = http.post(
    `${BASE_URL}/guidance/conversations/${conversationId}/messages`,
    JSON.stringify({ content: message }),
    { ...jsonHeaders(account.token), timeout: '130s' },
  );
  coachLatency.add(Date.now() - coachStartedAt);
  const coachSucceeded = check(coachResponse, {
    'coach responded successfully': (response) => response.status === 201 && Boolean(response.json('message.id')),
    'coach response is non-empty': (response) => typeof response.json('message.content') === 'string' && response.json('message.content').trim().length > 0,
  });
  coachFailures.add(!coachSucceeded);
  if (!coachSucceeded) return;

  const extractionStartedAt = Date.now();
  const extraction = waitForSoulprint(account.token, marker);
  extractionLatency.add(Date.now() - extractionStartedAt);
  extractionFailures.add(!extraction.success);
  check(extraction, {
    'own marker extracted into Soulprint': (result) => result.success,
  });

  const probe = __VU % 2 === 0
    ? { token: data.isolation.firstToken, foreignId: data.isolation.secondEntryId }
    : { token: data.isolation.secondToken, foreignId: data.isolation.firstEntryId };
  const foreignResponse = http.get(
    `${BASE_URL}/soulprint/entries/${probe.foreignId}`,
    { ...jsonHeaders(probe.token), responseCallback: EXPECT_NOT_FOUND },
  );
  const isolated = check(foreignResponse, {
    'foreign Soulprint entry is hidden': (response) => response.status === 404,
  });
  if (!isolated) isolationFailures.add(1);
}

export function handleSummary(data) {
  // setup_data contains short-lived access tokens used by the authorization
  // probes. Never persist or print those credentials in test reports.
  const safeData = { ...data, setup_data: data.setup_data ? { redacted: true } : undefined };
  return {
    stdout: JSON.stringify(safeData, null, 2),
    [`load-results/guidance-soulprint-${RUN_ID}.json`]: JSON.stringify(safeData, null, 2),
  };
}
