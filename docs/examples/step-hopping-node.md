# Step Hopping — Node.js

Demonstrates dynamic workflow manipulation: inserting steps at runtime, deleting steps by ID, reordering steps with `moveStep`, and using `pause()` / `resume()` to suspend and continue execution mid-flow.

## Overview

You will learn:
- Adding steps dynamically with `addStep()`, `addStepAtIndex()`, `pushStep()`, `unshiftStep()`
- Removing steps with `deleteStep()`, `deleteStepByIndex()`, `popStep()`, `shiftStep()`
- Reordering steps with `moveStep(fromIndex, toIndex)`
- Pausing a workflow mid-execution with `pause()`
- Resuming a paused workflow with `resume()`
- Listening to `WORKFLOW_STEP_ADDED`, `WORKFLOW_STEP_REMOVED`, `WORKFLOW_STEP_MOVED` events

## Complete Example

```javascript
import {
  Workflow,
  Step,
  ConditionalStep,
  State,
  workflow_event_names,
} from '@ronaldroe/micro-flow';

// ─── Logging ──────────────────────────────────────────────────────────────────

const wfEvents = State.get('events.workflow');

wfEvents.on(workflow_event_names.WORKFLOW_STEP_ADDED, (data) => {
  console.log(`  [event] Step added — now ${data.steps?.length} step(s)`);
});

wfEvents.on(workflow_event_names.WORKFLOW_STEP_REMOVED, (data) => {
  console.log(`  [event] Step removed — now ${data.steps?.length} step(s)`);
});

wfEvents.on(workflow_event_names.WORKFLOW_STEP_MOVED, (data) => {
  console.log(`  [event] Step moved`);
});

wfEvents.on(workflow_event_names.WORKFLOW_PAUSED, (data) => {
  console.log(`  [event] Workflow "${data.name}" paused after step: ${data.current_step}`);
});

wfEvents.on(workflow_event_names.WORKFLOW_RESUMED, (data) => {
  console.log(`  [event] Workflow "${data.name}" resumed`);
});

// ─── Part 1: Build a workflow and manipulate steps before executing ────────────

console.log('\n=== Part 1: Build-time step manipulation ===\n');

const wf = new Workflow({ name: 'dynamic-deploy', exit_on_error: false });

// Define reusable steps
const buildStep = new Step({
  name: 'build',
  callable: async function () {
    this.setState('deploy.artifacts', ['app.js', 'styles.css', 'index.html']);
    console.log('  Built artifacts');
    return { artifacts: State.get('deploy.artifacts') };
  },
});

const testStep = new Step({
  name: 'test',
  callable: async function () {
    const artifacts = this.getState('deploy.artifacts') ?? [];
    console.log(`  Testing ${artifacts.length} artifact(s)`);
    return { tests: 'passed', count: artifacts.length };
  },
});

const deployStep = new Step({
  name: 'deploy',
  callable: async function () {
    console.log('  Deploying to production');
    return { deployed: true, env: 'production' };
  },
});

const notifyStep = new Step({
  name: 'notify',
  callable: async () => {
    console.log('  Sending deployment notification');
    return { notified: true };
  },
});

// Start with build and deploy
wf.addStep(buildStep);
wf.addStep(deployStep);
console.log('Initial steps:', wf.steps.map((s) => s.name).join(' → '));
// 'build → deploy'

// Insert test before deploy
wf.addStepAtIndex(testStep, 1);
console.log('After insert:  ', wf.steps.map((s) => s.name).join(' → '));
// 'build → test → deploy'

// Append notify at the end
wf.pushStep(notifyStep);
console.log('After push:    ', wf.steps.map((s) => s.name).join(' → '));
// 'build → test → deploy → notify'

// Add a smoke-test step at the very beginning
wf.unshiftStep(new Step({
  name: 'smoke-test',
  callable: async function () {
    this.setState('deploy.startTime', Date.now());
    console.log('  Running pre-deploy smoke tests');
    return { smokeTestPassed: true };
  },
}));
console.log('After unshift: ', wf.steps.map((s) => s.name).join(' → '));
// 'smoke-test → build → test → deploy → notify'

// Move notify to position 0 (run it first)
wf.moveStep(wf.steps.findIndex((s) => s.name === 'notify'), 0);
console.log('After move:    ', wf.steps.map((s) => s.name).join(' → '));
// 'notify → smoke-test → build → test → deploy'

// Actually we don't want notify first — move it back to end
wf.moveStep(0, wf.steps.length - 1);
console.log('After move back:', wf.steps.map((s) => s.name).join(' → '));
// 'smoke-test → build → test → deploy → notify'

// Remove test by ID if not in CI environment
const CI = process.env.CI === 'true';
if (!CI) {
  wf.deleteStep(testStep.id);
  console.log('After delete (no CI):', wf.steps.map((s) => s.name).join(' → '));
  // 'smoke-test → build → deploy → notify'

  // Re-add it since we still want it for this demo
  wf.addStepAtIndex(testStep, 2);
}

console.log('\nFinal step order:', wf.steps.map((s) => s.name).join(' → '));
console.log('');

const firstRun = await wf.execute();
console.log('\nFirst run status:', firstRun.status);
console.log('Steps executed:', firstRun.results.length);

// ─── Part 2: Pause and resume ─────────────────────────────────────────────────

console.log('\n=== Part 2: Pause and resume ===\n');

let pauseCount = 0;

const multiPhaseFlow = new Workflow({ name: 'multi-phase-deploy', exit_on_error: false });

multiPhaseFlow.addSteps([
  new Step({
    name: 'phase-1-init',
    callable: async function () {
      console.log('  Phase 1: Initializing resources');
      this.setState('phase.current', 1);
      return { phase: 1, status: 'initialized' };
    },
  }),
  new Step({
    name: 'phase-1-provision',
    callable: async function () {
      console.log('  Phase 1: Provisioning infrastructure');
      await new Promise((r) => setTimeout(r, 30));
      return { provisioned: true };
    },
  }),
  new Step({
    name: 'approval-gate',
    callable: async () => {
      // Pause here to wait for human approval
      console.log('  Pausing for manual approval before phase 2...');
      multiPhaseFlow.pause();
      return { gate: 'approval-required' };
    },
  }),
  new Step({
    name: 'phase-2-deploy',
    callable: async function () {
      console.log('  Phase 2: Deploying application');
      this.setState('phase.current', 2);
      return { phase: 2, deployed: true };
    },
  }),
  new Step({
    name: 'phase-2-verify',
    callable: async function () {
      console.log('  Phase 2: Verifying deployment');
      await new Promise((r) => setTimeout(r, 30));
      return { verified: true };
    },
  }),
  new Step({
    name: 'finalize',
    callable: async () => {
      console.log('  Finalizing deployment');
      return { finalized: true };
    },
  }),
]);

await multiPhaseFlow.execute();
console.log('\nStatus after phase 1:', multiPhaseFlow.status);
// 'paused'

// Simulate receiving external approval signal
console.log('\n--- Approval received, resuming workflow ---\n');

// Add a step dynamically before resuming (inject an audit log step)
multiPhaseFlow.addStepAtIndex(
  new Step({
    name: 'audit-approval',
    callable: async () => {
      console.log('  Audit: Recording approval decision');
      return { approved: true, approvedAt: new Date().toISOString(), approvedBy: 'ops-team' };
    },
  }),
  multiPhaseFlow.steps.findIndex((s) => s.name === 'phase-2-deploy')
);

await multiPhaseFlow.resume();
console.log('Status after phase 2:', multiPhaseFlow.status);
// 'complete'

// ─── Part 3: Dynamic workflow based on runtime data ───────────────────────────

console.log('\n=== Part 3: Runtime-driven step construction ===\n');

const featureFlags = {
  enableCDN: true,
  enableDatabase: true,
  enableCache: false,
  enableEmailNotifications: true,
};

const provisioningFlow = new Workflow({ name: 'conditional-provisioning' });

// Always run core setup
provisioningFlow.addStep(new Step({
  name: 'core-setup',
  callable: async function () {
    this.setState('provisioning.services', []);
    console.log('  Core infrastructure setup complete');
    return { core: true };
  },
}));

// Dynamically add steps based on feature flags
if (featureFlags.enableDatabase) {
  provisioningFlow.addStep(new Step({
    name: 'provision-database',
    callable: async function () {
      const services = this.getState('provisioning.services');
      this.setState('provisioning.services', [...services, 'database']);
      console.log('  Database provisioned');
      return { database: true };
    },
  }));
}

if (featureFlags.enableCDN) {
  provisioningFlow.addStep(new Step({
    name: 'provision-cdn',
    callable: async function () {
      const services = this.getState('provisioning.services');
      this.setState('provisioning.services', [...services, 'cdn']);
      console.log('  CDN provisioned');
      return { cdn: true };
    },
  }));
}

if (featureFlags.enableCache) {
  provisioningFlow.addStep(new Step({
    name: 'provision-cache',
    callable: async function () {
      const services = this.getState('provisioning.services');
      this.setState('provisioning.services', [...services, 'cache']);
      console.log('  Cache provisioned');
      return { cache: true };
    },
  }));
}

if (featureFlags.enableEmailNotifications) {
  provisioningFlow.addStep(new Step({
    name: 'provision-email',
    callable: async function () {
      const services = this.getState('provisioning.services');
      this.setState('provisioning.services', [...services, 'email']);
      console.log('  Email service provisioned');
      return { email: true };
    },
  }));
}

provisioningFlow.addStep(new Step({
  name: 'finalize-provisioning',
  callable: async function () {
    const services = this.getState('provisioning.services');
    console.log(`  Provisioning complete. Services: ${services.join(', ')}`);
    return { services, count: services.length };
  },
}));

const provResult = await provisioningFlow.execute();
console.log('\nProvisioning status:', provResult.status);
console.log('Services ready:', State.get('provisioning.services'));
```

## Key Concepts

### addStepAtIndex vs unshiftStep

`addStepAtIndex(step, 0)` and `unshiftStep(step)` both prepend a step. `addStepAtIndex` is more flexible as it inserts at any position, not just the front.

### Deleting by ID vs Index

`deleteStep(id)` is safer for dynamic workflows since step IDs are stable UUIDs. `deleteStepByIndex(index)` is convenient but requires knowing the current order.

### Pause / Resume Pattern

Call `workflow.pause()` inside any step callable to set `should_pause = true`. Execution suspends after that step completes. Call `await workflow.resume()` later — from an event handler, a timer, or after an external signal. You can even insert new steps between pause and resume.

### Runtime Step Construction

Building the steps array dynamically based on feature flags, environment variables, or runtime data is a first-class pattern. The workflow doesn't care when steps are added, as long as it is before `execute()` (or before `resume()` for inserted steps).

## Related Examples

- [Basic Workflow — Node.js](basic-workflow-node.md) — Foundational patterns
- [Step Hopping — React](step-hopping-react.md) — Same patterns in a React component
- [API Integration — Node.js](api-integration-node.md) — HTTP calls with retries
