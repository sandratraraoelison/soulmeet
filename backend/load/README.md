# Guidance and Soulprint concurrent load test

This k6 scenario creates isolated users, sends concurrent coach messages, waits for asynchronous Soulprint extraction, and checks object-level authorization with foreign entry IDs.

## Prerequisites

- Start the API and PostgreSQL with a working LLM provider.
- Install [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/).
- Run the test only against an environment where creating disposable `@soulmeet.test` accounts is acceptable.
- Create `backend/load-results` before running so k6 can write the JSON summary.

The script never deletes accounts because the public API has no load-test cleanup endpoint. Use a dedicated database or remove accounts with email prefix `load-<RUN_ID>-` after the run through an approved administrative process.

## Smoke test

```powershell
New-Item -ItemType Directory -Force load-results | Out-Null
$env:BASE_URL = 'http://localhost:3000/api/v1'
$env:RUN_ID = 'smoke-001'
$env:USERS = '5'
k6 run load/guidance-soulprint.js
```

## Progressive campaigns

Use a new `RUN_ID` for each campaign:

```powershell
$env:RUN_ID = 'normal-20'
$env:USERS = '20'
k6 run load/guidance-soulprint.js

$env:RUN_ID = 'stress-50'
$env:USERS = '50'
$env:EXTRACTION_TIMEOUT_SECONDS = '180'
k6 run load/guidance-soulprint.js
```

Relevant environment variables:

| Variable | Default | Purpose |
| --- | ---: | --- |
| `BASE_URL` | `http://localhost:3000/api/v1` | API root |
| `RUN_ID` | current timestamp | Unique account and marker namespace |
| `USERS` | `10` | Concurrent virtual users |
| `LOAD_TEST_PASSWORD` | test-only default | Password for disposable accounts |
| `EXTRACTION_TIMEOUT_SECONDS` | `90` | Maximum wait per Soulprint |
| `POLL_INTERVAL_SECONDS` | `2` | Extraction/Soulprint polling interval |

The default thresholds require less than 1% coach/extraction failures, zero isolation failures, coach p95 below 15 seconds, and Soulprint extraction p95 below 60 seconds. Adjust latency thresholds only after recording a justified hardware/provider baseline.

The regular endpoint is used instead of SSE so response latency and extraction completion remain easy to distinguish. A separate streaming campaign should measure time-to-first-token because total SSE duration is not equivalent to perceived latency.
