# Basic Workflow — Node.js

A foundational example demonstrating how to construct and execute a logic flow with `Workflow` and `Step`, inspect step results, check status, and use the event system for observability.

## Overview

You will learn:
- Creating a `Workflow` with multiple `Step` instances
- Passing data between steps via the `State` singleton
- Using `this.getState()` / `this.setState()` inside step callables
- Reading per-step results from `workflow.results`
- Checking `workflow.status` and `timing`
- Listening to workflow and step lifecycle events
- Configuring `exit_on_error` and step `max_retries`

## Complete Example

```javascript
import {
  Workflow,
  Step,
  State,
  workflow_event_names,
  step_event_names,
} from '@ronaldroe/micro-flow';

// ─── Event listeners ──────────────────────────────────────────────────────────

const wfEvents   = State.get('events.workflow');
const stepEvents = State.get('events.step');

wfEvents.on(workflow_event_names.WORKFLOW_RUNNING, (data) => {
  console.log(`\n▶ Workflow "${data.name}" started`);
});

wfEvents.on(workflow_event_names.WORKFLOW_COMPLETE, (data) => {
  console.log(`✓ Workflow "${data.name}" complete (${data.timing.execution_time_ms}ms)\n`);
});

wfEvents.on(workflow_event_names.WORKFLOW_FAILED, (data) => {
  console.error(`✗ Workflow "${data.name}" failed`);
});

stepEvents.on(step_event_names.STEP_RUNNING, (data) => {
  console.log(`  ▶ Step "${data.name}"`);
});

stepEvents.on(step_event_names.STEP_COMPLETE, (data) => {
  console.log(`  ✓ Step "${data.name}" (${data.timing.execution_time_ms}ms)`);
});

stepEvents.on(step_event_names.STEP_RETRYING, (data) => {
  console.warn(`  ↺ Step "${data.name}" retrying (${data.retry_count}/${data.max_retries})`);
});

stepEvents.on(step_event_names.STEP_FAILED, (data) => {
  console.error(`  ✗ Step "${data.name}" failed:`, data.errors?.[0]?.message);
});

// ─── Workflow definition ──────────────────────────────────────────────────────

const userOnboardingFlow = new Workflow({
  name: 'user-onboarding',
  exit_on_error: true,  // halt if any step fails
  steps: [
    // Step 1: Simulate fetching a user from a database
    new Step({
      name: 'fetch-user',
      max_retries: 2,
      max_timeout_ms: 5000,
      callable: async function () {
        // Simulated async database call
        const user = {
          id: 42,
          email: 'alice@example.com',
          name: 'Alice',
          plan: 'pro',
        };
        // Store in shared state for subsequent steps
        this.setState('onboarding.user', user);
        return user;
      },
    }),

    // Step 2: Validate the user
    new Step({
      name: 'validate-user',
      callable: async function () {
        const user = this.getState('onboarding.user');

        if (!user.email.includes('@')) {
          throw new Error(`Invalid email: ${user.email}`);
        }
        if (!user.name || user.name.trim().length === 0) {
          throw new Error('User name is required');
        }

        this.setState('onboarding.valid', true);
        return { valid: true };
      },
    }),

    // Step 3: Create profile
    new Step({
      name: 'create-profile',
      callable: async function () {
        const user = this.getState('onboarding.user');

        const profile = {
          userId: user.id,
          displayName: user.name,
          plan: user.plan,
          createdAt: new Date().toISOString(),
          preferences: { theme: 'light', notifications: true },
        };

        this.setState('onboarding.profile', profile);
        console.log(`    Created profile for ${user.name}`);
        return profile;
      },
    }),

    // Step 4: Send welcome email (with retry)
    new Step({
      name: 'send-welcome-email',
      max_retries: 3,
      max_timeout_ms: 10000,
      callable: async function () {
        const user = this.getState('onboarding.user');

        // Simulated email sending
        console.log(`    Sending welcome email to ${user.email}`);
        await new Promise((r) => setTimeout(r, 50)); // simulate async I/O

        return { sent: true, to: user.email, template: 'welcome' };
      },
    }),

    // Step 5: Log completion
    new Step({
      name: 'log-onboarding',
      callable: async function () {
        const user    = this.getState('onboarding.user');
        const profile = this.getState('onboarding.profile');

        const logEntry = {
          event: 'user_onboarded',
          userId: user.id,
          email: user.email,
          plan: user.plan,
          profileId: profile.userId,
          timestamp: new Date().toISOString(),
        };

        console.log('    Audit log:', JSON.stringify(logEntry));
        return logEntry;
      },
    }),
  ],
});

// ─── Execute ──────────────────────────────────────────────────────────────────

const result = await userOnboardingFlow.execute();

// ─── Inspect results ──────────────────────────────────────────────────────────

console.log('='.repeat(50));
console.log('Workflow status:       ', result.status);
console.log('Total execution time:  ', result.timing.execution_time_ms + 'ms');
console.log('Steps executed:        ', result.results.length);
console.log('');

for (const [i, entry] of result.results.entries()) {
  console.log(`Step ${i + 1} result:`, entry.data);
}

console.log('');
console.log('Final state snapshot:');
console.log('  User:   ', State.get('onboarding.user')?.name);
console.log('  Valid:  ', State.get('onboarding.valid'));
console.log('  Profile:', State.get('onboarding.profile')?.displayName);
```

## Key Concepts

### Workflow Construction

The `Workflow` constructor accepts `steps`, `exit_on_error`, and `throw_on_empty`. Steps are executed in declaration order. When `exit_on_error: true`, the first step failure halts the entire flow and marks the workflow as `'failed'`.

### State Sharing

The `State` singleton is the idiomatic way to pass data between steps. Inside a step callable, `this.setState(path, value)` and `this.getState(path)` are shortcuts to `State.set()` / `State.get()`. Use dot-notation paths like `'onboarding.user'`.

### Retries and Timeouts

Set `max_retries` and `max_timeout_ms` per step. The engine automatically retries on failure and races against the timeout. Each retry attempt is recorded in `step.retry_results`.

### Results Array

`workflow.results` is an array of `{ message, data }` objects, one per executed step. `data` is the return value of the step's callable.

### Event System

Lifecycle events flow through `State.get('events.workflow')` and `State.get('events.step')`. Use `on(eventName, listener)` to observe them. Use enum constants from `workflow_event_names` and `step_event_names` to avoid typos.

## Related Examples

- [API Integration — Node.js](api-integration-node.md) — HTTP calls, retries, `ConditionalStep`
- [Data Pipeline — Node.js](data-pipeline-node.md) — Multi-step ETL with State
- [Step Hopping — Node.js](step-hopping-node.md) — Dynamic step manipulation
