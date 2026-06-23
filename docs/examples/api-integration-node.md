# API Integration — Node.js

Demonstrates building a resilient HTTP API integration using `Workflow`, `Step`, `ConditionalStep`, `FlowControlStep`, and the `State` singleton. Covers retries with backoff, circuit breaker patterns, response branching, and error aggregation.

## Overview

You will learn:
- Wrapping API calls in `Step` with `max_retries` and `max_timeout_ms`
- Using `ConditionalStep` to branch on response status
- Using `FlowControlStep` to implement a circuit breaker
- Storing request/response context in `State`
- Aggregating errors across steps for structured error reporting

## Complete Example

```javascript
import {
  Workflow,
  Step,
  ConditionalStep,
  FlowControlStep,
  State,
  flow_control_types,
} from '@ronaldroe/micro-flow';

// ─── Initial state ────────────────────────────────────────────────────────────

State.set('api.failures', 0);
State.set('api.circuitBreaker.threshold', 3);
State.set('api.circuitBreaker.open', false);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  return res;
}

// ─── Workflow ─────────────────────────────────────────────────────────────────

const apiWorkflow = new Workflow({
  name: 'github-user-lookup',
  exit_on_error: false, // collect all errors, don't halt on first failure
  steps: [

    // Step 1: Check circuit breaker before any requests
    new FlowControlStep({
      name: 'circuit-breaker-guard',
      conditional: {
        subject: () => State.get('api.circuitBreaker.open'),
        operator: '===',
        value: true,
      },
      flow_control_type: flow_control_types.BREAK,
    }),

    // Step 2: Fetch user from GitHub API (with retry)
    new Step({
      name: 'fetch-github-user',
      max_retries: 3,
      max_timeout_ms: 8000,
      callable: async function () {
        const username = this.getState('request.username') ?? 'octocat';

        let res;
        try {
          res = await apiFetch(`https://api.github.com/users/${username}`);
        } catch (networkError) {
          // Network error — increment failure counter and rethrow to trigger retry
          const failures = this.getState('api.failures') + 1;
          this.setState('api.failures', failures);

          if (failures >= this.getState('api.circuitBreaker.threshold')) {
            this.setState('api.circuitBreaker.open', true);
            console.error('Circuit breaker opened after', failures, 'failures');
          }
          throw networkError;
        }

        this.setState('response.status', res.status);
        this.setState('response.ok', res.ok);

        if (!res.ok) {
          const errorBody = await res.json().catch(() => ({}));
          this.setState('response.error', errorBody);
          throw new Error(`GitHub API returned ${res.status}: ${errorBody.message ?? 'Unknown error'}`);
        }

        const user = await res.json();
        this.setState('response.user', user);
        return user;
      },
    }),

    // Step 3: Branch based on whether the user has a company affiliation
    new ConditionalStep({
      name: 'check-company-affiliation',
      conditional: {
        subject: () => State.get('response.user.company'),
        operator: 'not_nullish',
      },
      true_callable: async function () {
        const user = this.getState('response.user');
        const enriched = {
          ...user,
          affiliation_type: 'corporate',
          company_clean: user.company?.replace(/^@/, '').trim(),
        };
        this.setState('response.enriched', enriched);
        console.log(`  User works at: ${enriched.company_clean}`);
        return { affiliated: true, company: enriched.company_clean };
      },
      false_callable: async function () {
        const user = this.getState('response.user');
        this.setState('response.enriched', { ...user, affiliation_type: 'individual' });
        console.log(`  User is an individual contributor`);
        return { affiliated: false };
      },
    }),

    // Step 4: Fetch repositories
    new Step({
      name: 'fetch-repos',
      max_retries: 2,
      max_timeout_ms: 10000,
      callable: async function () {
        const username = this.getState('request.username') ?? 'octocat';

        const res = await apiFetch(
          `https://api.github.com/users/${username}/repos?sort=updated&per_page=5`
        );

        if (!res.ok) {
          throw new Error(`Failed to fetch repos: ${res.status}`);
        }

        const repos = await res.json();
        const summary = repos.map((r) => ({
          name: r.name,
          stars: r.stargazers_count,
          language: r.language,
          updatedAt: r.updated_at,
        }));

        this.setState('response.repos', summary);
        return { count: summary.length, repos: summary };
      },
    }),

    // Step 5: Assemble final profile
    new Step({
      name: 'assemble-profile',
      callable: async function () {
        const user  = this.getState('response.enriched') ?? this.getState('response.user');
        const repos = this.getState('response.repos') ?? [];

        const profile = {
          login:            user.login,
          name:             user.name,
          bio:              user.bio,
          location:         user.location,
          affiliation_type: user.affiliation_type,
          company:          user.company_clean ?? user.company,
          public_repos:     user.public_repos,
          followers:        user.followers,
          top_repos:        repos.slice(0, 3),
          fetched_at:       new Date().toISOString(),
        };

        this.setState('output.profile', profile);
        return profile;
      },
    }),
  ],
});

// ─── Run ──────────────────────────────────────────────────────────────────────

State.set('request.username', 'torvalds');

console.log('Fetching GitHub profile...\n');
const result = await apiWorkflow.execute();

// ─── Results ──────────────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(50));
console.log('Status:', result.status);
console.log('Time:  ', result.timing.execution_time_ms + 'ms\n');

if (State.get('api.circuitBreaker.open')) {
  console.error('⚠ Circuit breaker is open — API is unavailable');
} else {
  const profile = State.get('output.profile');
  if (profile) {
    console.log('Profile:');
    console.log('  Login:    ', profile.login);
    console.log('  Name:     ', profile.name);
    console.log('  Bio:      ', profile.bio);
    console.log('  Location: ', profile.location);
    console.log('  Company:  ', profile.company ?? '(none)');
    console.log('  Followers:', profile.followers);
    console.log('  Top repos:', profile.top_repos.map((r) => r.name).join(', '));
  }
}

// Collect any errors from the workflow
const errors = result.results
  .filter((r) => r.data instanceof Error || r.data?.error)
  .map((r) => r);
if (errors.length > 0) {
  console.log('\nErrors encountered:');
  errors.forEach((e) => console.error(' -', e));
}
```

## Key Concepts

### Circuit Breaker with FlowControlStep

The `FlowControlStep` named `circuit-breaker-guard` runs first. It reads `api.circuitBreaker.open` from `State`. If `true`, `flow_control_type: flow_control_types.BREAK` immediately halts the workflow — no requests are made. The circuit is opened inside the fetch step when the failure count crosses the threshold.

### Retries with Backoff

`max_retries: 3` on `fetch-github-user` causes the engine to retry up to 3 times on failure. Each failure increments the circuit breaker counter. The circuit opens automatically when the threshold is reached.

### ConditionalStep Branching

The `check-company-affiliation` step uses the `not_nullish` operator to test whether the API returned a company field. The true branch enriches the user object with corporate metadata; the false branch marks them as an individual.

### Structured Error Collection

With `exit_on_error: false`, all steps run regardless of failures. After execution, you can inspect `result.results` for steps that returned errors or filter by `step.status === 'failed'`.

## Related Examples

- [Basic Workflow — Node.js](basic-workflow-node.md) — Foundational patterns
- [Data Pipeline — Node.js](data-pipeline-node.md) — Multi-step ETL
- [Step Hopping — Node.js](step-hopping-node.md) — Dynamic workflow manipulation
