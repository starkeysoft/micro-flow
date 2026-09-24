# Micro-Flow

See Micro-Flow in action in the [demo repo](https://github.com/starkeysoft/micro-flow-demo).

[Click Here](https://survey.alchemer.com/s3/8882776/Micro-Flow-User-Survey) to complete the Micro-Flow user survey. It will take less than 5 minutes of your time.

Micro-Flow is a simple, lightweight, cross platform (browser and runtime) logic orchestration library. Micro-Flow makes async logic flows first-class objects — named, observable, pauseable, and composable — so a multi-step process is something you can reason about, monitor, and control, not just a wall of awaits.

## Why Micro-Flow?

Imperative async functions frequently turn into untraceable "black boxes" when they fail. Managing retries, timeouts, state logging, and progress tracking within complex logic chains usually requires writing brittle, custom boilerplate for every single task. This approach complicates unit testing and makes features like pausing or resuming execution nearly impossible to implement cleanly.

Micro-Flow treats logic as a first-class object. Instead of managing one monolithic async function, you construct a structured Workflow where every individual step is automatically monitored, timed, and controlled. It replaces manual try-catch boilerplate with a resilient runtime framework designed for complete predictability and explicit execution tracking. 

## Features

- 🔍 **Zero-Effort Observability** - Lifecycle events (`STEP_FAILED`, `WORKFLOW_COMPLETE`) emit automatically — eliminate manual log-sprinkling.
- ⏸️ **Pause, Resume, & Rewind** - Suspend any logic flow mid-pipeline and resume it later without losing local state.
- 🗄️ **Durable Persistence** - Serialize any `Workflow` or `Step` to JSON — even mid-pause — and hydrate it back later, in the same process or a different one.
- 🌿 **Declarative Branching** - Use `ConditionalStep` and `SwitchStep` to keep complex branching logic out of your callables and in the workflow structure.
- 🎯 **Dynamic Flow Control** - Break out of or skip steps dynamically at runtime.
- 💾 **Namespaced State Management** - Every `Workflow` (and the steps it owns) gets its own namespaced, dot-notation state — eliminate data-threading through arguments. _(The process-wide `State` singleton this replaced is deprecated — see [State Management](#state-management).)_
- ✨ **Cross-Tab/Worker Sync** - Broadcast events automatically via `BroadcastChannel` to reach other tabs and workers with zero configuration.
- 🌍 **Isomorphic by Design** - Run the same API in Node.js (≥18) and all modern browsers.
- 🎨 **Framework Agnostic** - Integrate seamlessly with React, Vue, Svelte, or vanilla JS.
- ⚡ **Lightweight Core** - ESM-first design with minimal production dependencies.

## Installation

```bash
npm install --save micro-flow
```

## Quick Start

### Node.js Example

```javascript
import { Workflow, Step } from 'micro-flow';

const workflow = new Workflow({
  name: 'data-processor',
  steps: [
    new Step({
      name: 'fetch-data',
      max_retries: 3, // Built-in resilience for flaky APIs
      callable: async () => {
        const response = await fetch('https://api.example.com/data');
        return response.json();
      }
    }),
    new Step({
      name: 'process-data',
      callable: async () => ({ processed: true })
    }),
    new Step({
      name: 'save-results',
      callable: async () => ({ saved: true })
    })
  ]
});

const result = await workflow.execute();
```

### ✨ Feature Spotlight: Cross-Tab Sync
Trigger logic in one tab and react to it in another. Events sync across workers and browser windows automatically:

```javascript
import { State } from 'micro-flow';

// Listen for updates from other tabs/workers
State.get('events.workflow').on('sync-event', (data) => {
  updateUI(data);
});

// Broadcast to all other contexts
State.get('events.workflow').emit('sync-event', { status: 'updated' });
```

### 🗄️ Feature Spotlight: Persistence
Save a workflow definition — or a paused, in-progress one — and reload it later. Function callables round-trip through a `CallableRegistry` (raw functions can't be serialized), while `Step`/`Workflow` callables serialize recursively as their own object graph:

```javascript
import { Workflow, Step, CallableRegistry } from 'micro-flow';

const registry = new CallableRegistry();
registry.register('chargeCard', async function chargeCard() {
  return { charged: true };
});

const workflow = new Workflow({
  name: 'checkout',
  callable_registry: registry,
  steps: [
    new Step({ name: 'charge', callable: registry.get('chargeCard'), callable_registry_key: 'chargeCard' }),
  ],
});

const saved = workflow.serialize(); // -> store this JSON string anywhere

// Later, in this process or a fresh one (after re-registering 'chargeCard'):
const reloaded = Workflow.hydrateSerialized(saved, registry);
await reloaded.execute();
```

### Browser: Coordinating UI Logic

```javascript
import { Workflow, Step } from './micro-flow.js';

const workflow = new Workflow({
  name: 'ui-update',
  steps: [
    new Step({
      name: 'show-loading',
      callable: async () => {
        document.getElementById('loader').style.display = 'block';
      }
    }),
    new Step({
      name: 'fetch-data',
      callable: async () => {
        const response = await fetch('/api/data');
        return response.json();
      }
    }),
    new Step({
      name: 'update-ui',
      callable: async () => {
        document.getElementById('content').textContent = 'Data loaded!';
        document.getElementById('loader').style.display = 'none';
      }
    })
  ]
});

document.getElementById('loadBtn').addEventListener('click', () => {
  workflow.execute();
});
```

### React: Decoupling Logic from Components

```javascript
import { Workflow, Step, State } from './micro-flow.js';
import { useState } from 'react';

function DataFetcher() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    const workflow = new Workflow({
      name: 'fetch-workflow',
      steps: [
        new Step({ name: 'start', callable: async () => setLoading(true) }),
        new Step({
          name: 'fetch',
          callable: async () => {
            const res = await fetch('/api/data');
            const json = await res.json();
            setData(json);
          }
        }),
        new Step({ name: 'complete', callable: async () => setLoading(false) })
      ]
    });

    await workflow.execute();
  };

  return (
    <div>
      <button onClick={fetchData} disabled={loading}>
        {loading ? 'Loading...' : 'Fetch Data'}
      </button>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
```

### Vue: Clean Reactive Lifecycle

```vue
<template>
  <button @click="runWorkflow" :disabled="isRunning">
    {{ isRunning ? 'Processing...' : 'Run Workflow' }}
  </button>
</template>

<script setup>
import { ref } from 'vue';
import { Workflow, Step } from './micro-flow.js';

const isRunning = ref(false);

const runWorkflow = async () => {
  const workflow = new Workflow({
    name: 'vue-workflow',
    steps: [
      new Step({
        name: 'process',
        callable: async () => {
          isRunning.value = true;
          await doAsyncWork();
        }
      }),
      new Step({
        name: 'finalize',
        callable: async () => { isRunning.value = false; }
      })
    ]
  });

  await workflow.execute();
};
</script>
```

## Core Concepts

### Workflows
Workflows execute a series of steps in sequence. Use them to manage:
- Sequential execution and error handling.
- Fine-grained pause and resume control.
- Event emission for real-time monitoring.
- Result aggregation and session tracking.

### Steps
Orchestrate functions, other steps, or entire workflows as individual units of work. Every step includes built-in retry and timeout policies.

### Callables
Define logic using callables. Assign any async function, step, or workflow to a step's `callable` parameter. This flexibility enables everything from simple logic chains to modularized, enterprise-scale flows.

### State Management

> **Deprecated:** The `State` singleton shown below is deprecated and will be removed in the next major version. By default, every `Workflow` (and the `Step`s it owns) now has its own namespaced state via the same `this.getState()`/`this.setState()` calls — no global singleton required. See [Deprecation: continuing to use `State`](docs/classes/state.md#deprecation-continuing-to-use-state) for how to opt back into the old, process-wide behavior in the meantime.

Manage namespaced state, scoped to a workflow and the steps it owns:

```javascript
import { Workflow, Step } from 'micro-flow';

const workflow = new Workflow({
  steps: [
    new Step({
      callable: async function () {
        // Set and get values with dot-notation
        this.setState('user.name', 'John Doe');
        const timeout = this.getState('config.timeout') ?? 3000;
      },
    }),
  ],
});

await workflow.execute();
```

### Events
Monitor lifecycle events for workflows, steps, and state. Use Node's EventEmitter syntax or the browser's CustomEvent syntax—both support all environments.

### Persistence
Turn a `Workflow` (or `Step`) into a JSON string with `serialize()`, and rebuild it with `Workflow.hydrateSerialized()` / `Step.hydrateSerialized()` — including which subclass each step actually is (`ConditionalStep`, `LoopStep`, `SwitchStep`, etc. all come back as themselves). Function callables need a `CallableRegistry` to resolve by name after hydration; `Step`/`Workflow` callables need nothing extra, since they serialize recursively as their own object graph. Other function-valued fields (conditional subjects/values, a `SwitchStep` subject, a function `LoopStep` iterable, `result_per_step_function`) are resolved through the same registry. A workflow's instance state (`setState()` data) is deliberately not serialized.

## Use Cases

### Power Backend Processes (Node.js)
- **Data Pipelines** - Build ETL and transformation workflows.
- **API Integrations** - Orchestrate multi-step API calls with built-in retries.
- **Automation** - Automate scheduled jobs and batch processing.
- **Microservices** - Coordinate complex service calls.

### Enhance Frontend Logic (Browser)
- **Multi-Step UI** - Build registration flows and checkout wizards.
- **Data Fetching** - Coordinate sequential API calls with caching.
- **Animations** - Sequence complex UI animations.
- **State Sync** - Sync auth state and shopping carts across tabs instantly.
- **Game Logic and Behaviors** - Manage NPC behavior states or enemy actions, such as idle behavior vs attack behavior.

## Documentation
Explore the full documentation in the [docs](docs/) directory:
- [API Reference](docs/index.md)
- [Workflow API](docs/classes/workflow.md)
- [Step API](docs/classes/steps/step.md)
- [State Management](docs/classes/state.md) _(the `State` singleton documented here is deprecated)_
- [CallableRegistry API (Persistence)](docs/classes/callable_registry.md)
