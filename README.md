# Micro-Flow

Micro-Flow is a simple, lightweight, cross-platform logic orchestration library. It turns messy, imperative async chains into observable, resilient "logic flows" that run anywhere—from your React frontend to your Node.js backend.

## Why Micro-Flow?

We've all been there: a 100-line async function that acts as a "black box" when it fails. You have to manually hard-code retries, timeouts, state logging, and progress tracking for every single task. It’s brittle, a nightmare to unit test, and impossible to pause or resume.

**Micro-Flow** makes your logic a first-class object. Instead of one giant function, you build a **Workflow** where every step is automatically tracked, timed, and controlled. It replaces "Try-Catch" boilerplate with professional orchestration.

## Features

- 🔍 **Zero-Effort Observability** - Lifecycle events (`STEP_FAILED`, `WORKFLOW_COMPLETE`) emit automatically — eliminate manual log-sprinkling.
- ⏸️ **Pause, Resume, & Rewind** - Suspend any logic flow mid-pipeline and resume it later without losing local state.
- 🌿 **Declarative Branching** - Use `ConditionalStep` and `SwitchStep` to keep complex branching logic out of your callables and in the workflow structure.
- 🎯 **Dynamic Flow Control** - Break out of or skip steps dynamically at runtime.
- 💾 **Namespaced State Management** - Access global state through a namespaced singleton with dot-notation support — eliminate data-threading through arguments.
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
Manage namespaced global state across all workflows and steps:

```javascript
import { State } from 'micro-flow';

// Set and get values with dot-notation
State.set('user.name', 'John Doe');
const timeout = State.get('config.timeout', 3000);

// Merge or iterate over collections
State.merge({ settings: { theme: 'dark' } });
State.each('users', (user) => console.log(user.name));
```

### Events
Monitor lifecycle events for workflows, steps, and state. Use Node's EventEmitter syntax or the browser's CustomEvent syntax—both support all environments.

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

## Documentation
Explore the full documentation in the [docs](docs/) directory:
- [API Reference](docs/index.md)
- [Workflow API](docs/classes/workflow.md)
- [Step API](docs/classes/steps/step.md)
- [State Management](docs/classes/state.md)
