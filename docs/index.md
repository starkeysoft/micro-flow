# Micro-Flow Documentation

Complete API documentation for micro-flow, a lightweight workflow orchestration library for Node.js and browser environments.

## Table of Contents

### Getting Started
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Examples](examples/)

### Core Classes

#### Base Classes
- [Workflow](classes/workflow.md) - Workflow orchestration class
- [State](classes/state.md) - Global state management

#### Steps
- [Step](classes/steps/step.md) - Basic executable step
- [LogicStep](classes/steps/logic_step.md) - Conditional logic step
- [ConditionalStep](classes/steps/conditional_step.md) - Branching conditional step
- [FlowControlStep](classes/steps/flow_control_step.md) - Flow control step (break, skip)
- [CaseStep](classes/steps/case.md) - Case-based matching step
- [SwitchStep](classes/steps/switch_step.md) - Switch-style branching step
- [LoopStep](classes/steps/loop_step.md) - Looping step
- [DelayStep](classes/steps/delay_step.md) - Delay execution step

#### Events
- [Event](classes/events/event.md) - Base event emitter
- [WorkflowEvent](classes/events/workflow_event.md) - Workflow-specific events
- [StepEvent](classes/events/step_event.md) - Step-specific events
- [StateEvent](classes/events/state_event.md) - State-specific events
- [Broadcast](classes/events/broadcast.md) - Cross-tab/window communication

### Enumerations

#### Type Enums
- [Base Types](enums/base_types.md) - Base component types (step/workflow)
- [Step Types](enums/step_types.md) - General step categorization
- [Sub Step Types](enums/sub_step_types.md) - Step class name mappings
- [Logic Step Types](enums/logic_step_types.md) - Logic step subcategories
- [Conditional Step Comparators](enums/conditional_step_comparators.md) - Comparison operators
- [Flow Control Types](enums/flow_control_types.md) - Flow control types
- [Loop Types](enums/loop_types.md) - Loop iteration types
- [Delay Types](enums/delay_types.md) - Delay calculation types

#### Status Enums
- [Step Statuses](enums/step_statuses.md) - Step execution statuses
- [Workflow Statuses](enums/workflow_statuses.md) - Workflow execution statuses

#### Event Enums
- [Step Event Names](enums/step_event_names.md) - Step lifecycle events
- [Workflow Event Names](enums/workflow_event_names.md) - Workflow lifecycle events
- [State Event Names](enums/state_event_names.md) - State operation events

#### System Enums
- [Errors and Warnings](enums/errors.md) - Error and warning messages

### Examples

#### Backend (Node.js)
- [Basic Workflow](examples/basic-workflow-node.md) - Simple workflow example
- [Data Processing Pipeline](examples/data-pipeline-node.md) - ETL pipeline example
- [API Integration](examples/api-integration-node.md) - External API integration
- [Step Hopping](examples/step-hopping-node.md) - Jumping between steps in Node

#### Frontend (Browser)
- [React Form Workflow](examples/form-workflow-react.md) - Multi-step form with React
- [Vue Data Fetching](examples/data-fetching-vue.md) - Data fetching with Vue
- [Vanilla JS Animation](examples/animation-browser.md) - Animation sequencing
- [React Step Hopping](examples/step-hopping-react.md) - Jumping between steps in React

## Installation

```bash
npm install micro-flow
```

## Quick Start

### Node.js Example

```javascript
import { Workflow, Step } from 'micro-flow';

// Create a workflow
const workflow = new Workflow({
  name: 'my-workflow',
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
        return 'processed';
      }
    })
  ]
});

// Execute the workflow
await workflow.execute();
console.log('Results:', workflow.results);
```

### Browser Example

```javascript
import { Workflow, Step } from './micro-flow.js';

const workflow = new Workflow({
  name: 'browser-workflow',
  steps: [
    new Step({
      name: 'update-ui',
      callable: async () => {
        document.getElementById('status').textContent = 'Loading...';
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
      name: 'render-data',
      callable: async () => {
        document.getElementById('status').textContent = 'Complete';
      }
    })
  ]
});

await workflow.execute();
```

### React Example

```javascript
import { Workflow, Step } from './micro-flow.js';
import { useState } from 'react';

function MyComponent() {
  const [data, setData] = useState(null);

  const runWorkflow = async () => {
    const workflow = new Workflow({
      name: 'data-workflow',
      steps: [
        new Step({
          name: 'fetch',
          callable: async () => {
            const res = await fetch('/api/data');
            const json = await res.json();
            setData(json);
          }
        })
      ]
    });

    await workflow.execute();
  };

  return (
    <button onClick={runWorkflow}>
      Load Data
    </button>
  );
}
```

## Key Concepts

### Workflows
Workflows are containers for steps that execute in sequence. They provide:
- Sequential step execution
- Error handling
- Pause/resume capabilities
- Event emission
- State management

### Steps
Steps are individual units of work that can:
- Execute functions
- Execute other steps or workflows
- Handle errors
- Emit lifecycle events

### State Management
Global state accessible across all workflows and steps:
- Dot-notation path access - Access data using a string representation of the same syntax JavaScript uses to access array indices and object keys. `"users[0].email"`
- Nested object support
- Array indexing
- Type-safe operations

### Events
Event-driven architecture for monitoring:
- Workflow lifecycle events
- Step lifecycle events
- Custom event handlers
- Broadcast support

## Common Patterns

### Conditional Execution

```javascript
import { ConditionalStep } from 'micro-flow';

new ConditionalStep({
  name: 'check-env',
  conditional: {
    subject: process.env.NODE_ENV,
    operator: '===',
    value: 'production'
  },
  true_callable: async () => loadProdConfig(),
  false_callable: async () => loadDevConfig()
});
```

### Flow Control

```javascript
import { FlowControlStep, flow_control_types } from 'micro-flow';

new FlowControlStep({
  name: 'break-on-error',
  conditional: {
    subject: errorCount,
    operator: '>',
    value: 0
  },
  flow_control_type: flow_control_types.BREAK
});
```

### Event Listening

```javascript
import { State } from 'micro-flow';

const workflowEvents = State.get('events.workflow');

workflowEvents.on('workflow_complete', (data) => {
  console.log('Workflow completed:', data.name);
});
```

## API Reference

For detailed API documentation, see the individual class and enum pages listed in the table of contents above.

## Browser Compatibility

Micro-flow works in all modern browsers that support:
- ES6 Modules
- Async/await
- CustomEvent
- EventTarget

## Node.js Compatibility

Requires Node.js 14+ for full ES6 module support.

## License

See LICENSE file for details.
