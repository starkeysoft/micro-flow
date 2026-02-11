# Micro-Flow

A lightweight, flexible workflow orchestration library for Node.js and browser environments. Build complex, sequential processes with ease using an intuitive API that supports conditional logic, flow control, event handling, and state management.

## Features

- 🚀 **Simple & Intuitive** - Easy-to-understand API for building workflows
- 🔄 **Sequential Execution** - Run steps in order with automatic error handling
- 🌿 **Conditional Logic** - Branch execution based on conditions
- 🎯 **Flow Control** - Break, skip, or pause workflow execution
- 📡 **Event-Driven** - Listen to workflow and step lifecycle events
- 💾 **State Management** - Built-in global state with nested path access
- 📢 **Cross-Tab/Worker Communication** - Broadcast messages between browser tabs/windows or between workers in your favorite JS runtime
- 🌐 **Universal** - Works in backend runtimes like Node.js and all modern browsers
- ⚡ **Minimal Dependencies** - Lightweight and simple
- 🎨 **Framework Friendly** - Integrates seamlessly with React, Vue, your favorite framework and vanilla JS

## Installation

```bash
npm install --save micro-flow
```

## Quick Start

### Node.js Example

```javascript
import { Workflow, Step } from 'micro-flow';

// Create a simple workflow
const workflow = new Workflow({
  name: 'data-processor',
  steps: [
    new Step({
      name: 'fetch-data',
      callable: async () => {
        const response = await fetch('https://api.example.com/data');
        return response.json();
      }
    }),
    new Step({
      name: 'process-data',
      callable: async () => {
        console.log('Processing data...');
        return { processed: true };
      }
    }),
    new Step({
      name: 'save-results',
      callable: async () => {
        console.log('Saving results...');
        return { saved: true };
      }
    })
  ]
});

// Execute the workflow
const result = await workflow.execute();
console.log('Workflow complete!', result.results);
```

### Browser Example

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

### React Example

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
        new Step({
          name: 'start',
          callable: async () => {
            setLoading(true);
          }
        }),
        new Step({
          name: 'fetch',
          callable: async () => {
            const res = await fetch('/api/data');
            const json = await res.json();
            setData(json);
          }
        }),
        new Step({
          name: 'complete',
          callable: async () => {
            setLoading(false);
          }
        })
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

### Vue Example

```vue
<template>
  <div>
    <button @click="runWorkflow" :disabled="isRunning">
      {{ isRunning ? 'Processing...' : 'Run Workflow' }}
    </button>
    <p>{{ result }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Workflow, Step } from './micro-flow.js';

const isRunning = ref(false);
const result = ref('');

const runWorkflow = async () => {
  const workflow = new Workflow({
    name: 'vue-workflow',
    steps: [
      new Step({
        name: 'step-1',
        callable: async () => {
          isRunning.value = true;
          await new Promise(resolve => setTimeout(resolve, 1000));
          return 'Step 1 complete';
        }
      }),
      new Step({
        name: 'step-2',
        callable: async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return 'Step 2 complete';
        }
      })
    ]
  });

  const workflowResult = await workflow.execute();
  result.value = 'Workflow complete!';
  isRunning.value = false;
};
</script>
```

## Core Concepts

### Workflows

Workflows are primary structures that execute a series of steps in sequence. They provide:

- Sequential step execution
- Error handling with `exit_on_error` option
- Pause and resume capabilities
- Event emission for monitoring
- Result collection

```javascript
import { Workflow } from 'micro-flow';

const workflow = new Workflow({
  name: 'my-workflow',
  exit_on_error: true,  // Stop on first error
  steps: [/* array of steps */]
});
```

### Steps

Steps are individual units of work that execute functions, other steps, or even entire workflows:

```javascript
import { Step } from 'micro-flow';

const step = new Step({
  name: 'my-step',
  callable: async () => {
    // Your async code here
    return result;
  }
});
```

### Callables

Most step types accept a `callable` parameter. Callables are the individual actions a step can take.

A callable can be any async function, another step, or even a whole workflow. That flexibility allows for everything from very simple workflows to large, modularized flows broken down into logical units for execution.

### State Management

Access global state across all workflows and steps:

```javascript
import { State } from 'micro-flow';

// Set values
State.set('user.name', 'John Doe');
State.set('config.timeout', 5000);

// Get values
const userName = State.get('user.name');
const timeout = State.get('config.timeout', 3000); // with default

// Delete values
State.delete('user.name');

// Merge objects into state
State.merge({ settings: { theme: 'dark', lang: 'en' } });

// Iterate over collections
State.set('users', [{ name: 'Alice' }, { name: 'Bob' }]);
State.each('users', (user, index) => {
  console.log(`User ${index}: ${user.name}`);
});

// Freeze state (make immutable)
State.freeze();

// Reset state to defaults
State.reset();
```

### Events

Listen to workflow, step, and state lifecycle events. You can do this using Node's EventEmitter syntax or the browser's CustomEvent syntax. Both work in any environment:

```javascript
import { State } from 'micro-flow';

const workflowEvents = State.get('events.workflow');

workflowEvents.on('workflow_complete', (data) => {
  console.log(`Workflow ${data.name} completed in ${data.timing.execution_time_ms}ms`);
});

const stepEvents = State.get('events.step');

stepEvents.on('step_failed', (data) => {
  console.error(`Step ${data.name} failed:`, data.errors);
});

const stateEvents = State.get('events.state');

stateEvents.on('set', (data) => {
  console.log('State modified:', data.state);
});

stateEvents.on('deleted', (data) => {
  console.log('State property deleted');
});
```

### Cross-Tab/Worker Communication

Broadcast messages between browser tabs and windows or across workers in your favorite JS runtime:

```javascript
import { Broadcast } from './micro-flow.js';

const broadcast = new Broadcast('my-channel');

// Send messages to other tabs
broadcast.send({ type: 'update', data: { userId: 123 } });

// Receive messages from other tabs
broadcast.onReceive((data) => {
  console.log('Message from another tab:', data);
  if (data.type === 'update') {
    updateUI(data.data);
  }
});

// Clean up when done
broadcast.destroy();
```

## Use Cases

### Backend (Node.js)

- **Data Processing Pipelines** - ETL workflows, data transformation
- **API Integrations** - Multi-step API calls with retry logic
- **Task Automation** - Scheduled jobs, batch processing
- **Microservices Orchestration** - Coordinate service calls
- **Testing Workflows** - Integration test sequences

### Frontend (Browser)

- **Multi-Step Forms** - Registration, checkout, surveys
- **Data Fetching** - Sequential API calls with caching
- **Animation Sequences** - Complex UI animations
- **User Onboarding** - Step-by-step tutorials
- **State Machines** - UI state management
- **Cross-Tab Synchronization** - Auth state, shopping cart, notifications
- **Real-Time Collaboration** - Multi-tab editing, shared state

## Advanced Examples

### Node.js - Data Pipeline with Error Handling

```javascript
import { Workflow, Step, ConditionalStep, State } from 'micro-flow';

const pipeline = new Workflow({
  name: 'data-pipeline',
  exit_on_error: false,
  steps: [
    new Step({
      name: 'extract',
      callable: async () => {
        const data = await fetchFromDatabase();
        State.set('pipeline.raw', data);
        return data;
      }
    }),
    new ConditionalStep({
      name: 'validate',
      conditional: {
        subject: State.get('pipeline.raw')?.length,
        operator: '>',
        value: 0
      },
      true_callable: async () => ({ valid: true }),
      false_callable: async () => {
        throw new Error('No data to process');
      }
    }),
    new Step({
      name: 'transform',
      callable: async () => {
        const raw = State.get('pipeline.raw');
        const transformed = raw.map(transform);
        State.set('pipeline.transformed', transformed);
        return transformed;
      }
    }),
    new Step({
      name: 'load',
      callable: async () => {
        const data = State.get('pipeline.transformed');
        await saveToDatabase(data);
        return { saved: data.length };
      }
    })
  ]
});

await pipeline.execute();
```

### Browser - Multi-Step Form with Validation

```javascript
import { Workflow, ConditionalStep } from './micro-flow.js';

function createFormWorkflow(formData) {
  return new Workflow({
    name: 'form-submission',
    steps: [
      new ConditionalStep({
        name: 'validate-email',
        conditional: {
          subject: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email),
          operator: '===',
          value: true
        },
        true_callable: async () => ({ valid: true }),
        false_callable: async () => {
          throw new Error('Invalid email');
        }
      }),
      new Step({
        name: 'submit',
        callable: async () => {
          const response = await fetch('/api/submit', {
            method: 'POST',
            body: JSON.stringify(formData)
          });
          return response.json();
        }
      }),
      new Step({
        name: 'show-success',
        callable: async () => {
          document.getElementById('message').textContent = 'Success!';
        }
      })
    ]
  });
}
```

## Documentation

Full documentation is available in the [docs](docs/) directory:

- [API Documentation](docs/index.md) - Complete API reference
- [Classes](docs/classes/) - Workflow, Step, State, and more
- [Events](docs/classes/events/) - Event system documentation
- [Enums](docs/enums/) - Status codes and constants
- [Examples](docs/examples/) - Comprehensive examples

### Quick Links

**Core Classes:**
- [Workflow API](docs/classes/workflow.md)
- [Step API](docs/classes/steps/step.md)
- [State Management](docs/classes/state.md)

**Logic Steps:**
- [LogicStep API](docs/classes/steps/logic_step.md)
- [ConditionalStep API](docs/classes/steps/conditional_step.md)
- [FlowControlStep API](docs/classes/steps/flow_control_step.md)
- [CaseStep API](docs/classes/steps/case.md)
- [SwitchStep API](docs/classes/steps/switch_step.md)
- [LoopStep API](docs/classes/steps/loop_step.md)
- [DelayStep API](docs/classes/steps/delay_step.md)

**Events:**
- [Event System](docs/classes/events/event.md)
- [WorkflowEvent API](docs/classes/events/workflow_event.md)
- [StepEvent API](docs/classes/events/step_event.md)
- [StateEvent API](docs/classes/events/state_event.md)
- [Broadcast API](docs/classes/events/broadcast.md)

**Enumerations:**
- [Base Types](docs/enums/base_types.md)
- [Step Types](docs/enums/step_types.md)
- [Sub Step Types](docs/enums/sub_step_types.md)
- [Logic Step Types](docs/enums/logic_step_types.md)
- [Conditional Step Comparators](docs/enums/conditional_step_comparators.md)
- [Flow Control Types](docs/enums/flow_control_types.md)
- [Step Statuses](docs/enums/step_statuses.md)
- [Workflow Statuses](docs/enums/workflow_statuses.md)
- [Step Event Names](docs/enums/step_event_names.md)
- [Workflow Event Names](docs/enums/workflow_event_names.md)
- [State Event Names](docs/enums/state_event_names.md)
- [Delay Types](docs/enums/delay_types.md)
- [Loop Types](docs/enums/loop_types.md)
- [Errors and Warnings](docs/enums/errors.md)

## Browser Compatibility

Micro-flow works in all modern browsers that support:
- ES6 Modules
- Async/await
- CustomEvent API
- EventTarget API

Supported browsers:
- Chrome/Edge 63+
- Firefox 60+
- Safari 11.1+
- Opera 50+

## Node.js Compatibility

Requires Node.js 14+ for full ES6 module support.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Why Micro-Flow?

Micro-flow is designed to be:

- **Lightweight** - Small footprint, minimal dependencies
- **Simple** - Easy to learn and use
- **Flexible** - Works in Node.js and browsers
- **Powerful** - Handles complex workflows with ease

Perfect for projects that need workflow orchestration without the complexity of enterprise solutions.
