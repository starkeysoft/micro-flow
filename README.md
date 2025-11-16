# Micro Flow - Workflows for Developers

A dead simple, lightweight (~35k g-zipped), flexible workflow library for automating asynchronous tasks.
Works on both frontend and backend.
Minimal dependencies

Micro Flow is:
  - A library for orchestrating flows _in code_ for abstracting away routines the developer would otherwise write themselves.

Micro Flow is not:
  - A workflow engine. You could certainly build one on top of it, but Micro Flow is made by and for developers to create shortcuts in development.

Have a look through this file as well as the docs for examples of how you can use Micro Flow. Or, make a PR with your own example in the examples section of the docs.

Some ideas:
  - Form validation and submission
  - Animations
  - Mapping data from requests
  - "Wizards" - a flow of steps that allow someone to set something up or configure their software
  - Data processing pipelining
  - Scheduling and automating tasks
  - More complex UI reactivity in fewer lines of code

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
  - [Workflows](#workflows)
  - [Steps](#steps)
  - [State Management](#state-management)
  - [Events](#events)
- [Step Types](#step-types)
  - [DelayStep](#delaystep)
  - [ConditionalStep](#conditionalstep)
  - [LoopStep](#loopstep)
  - [SwitchStep](#switchstep)
  - [FlowControlStep](#flowcontrolstep)
- [API Reference](#api-reference)
  - [Classes](#classes)
  - [Enums](#enums)
  - [Helpers](#helpers)
- [Examples](#examples)
  - [Basic Workflow](#basic-workflow)
  - [Conditional Branching](#conditional-branching)
  - [Loops](#loops)
  - [Nested Workflows](#nested-workflows)
  - [Error Handling](#error-handling)
- [Advanced Usage](#advanced-usage)
  - [Event Listeners](#event-listeners)
  - [State Access](#state-access)
  - [Flow Control](#flow-control)
- [Documentation](#documentation)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Micro Flow is a robust workflow orchestration library that enables you to build complex, maintainable workflows with support for sequential execution, conditional branching, loops, sub-workflows, delays, and comprehensive event systems. Perfect for automating multi-step processes, building state machines, and orchestrating complex async operations.

## Features

✅ **Sequential Step Execution** - Chain multiple steps with automatic lifecycle management  
✅ **Conditional Branching** - Execute different paths based on runtime conditions  
✅ **Loops** - Support for while loops and for-each iterations  
✅ **Switch Statements** - Multi-way branching with case matching  
✅ **Nested Workflows** - Pass workflows as callables to Step for composition  
✅ **Delays** - Time-based delays with support for cron scheduling  
✅ **Event System** - Comprehensive lifecycle events for monitoring and debugging  
✅ **State Management** - Built-in context passing and state cloning  
✅ **Flow Control** - Break, continue, and skip operations  
✅ **Error Handling** - Configurable error handling with exit-on-failure options  
✅ **Async Support** - Full support for asynchronous operations  
✅ **Type Safety** - Structured enums for step types, statuses, and events

## TODOs
  - Returns from steps aren't completely consistent. Requires standardization.
  - Store state externally rather than passing it along. This will help keep the size of returns down as well.

## Installation

```bash
npm install micro-flow
```

## Requirements

- Node.js >= 18.0.0
- ES Modules support

## Quick Start

```javascript
import { Workflow, Step, DelayStep, StepTypes } from 'micro-flow';

// Create a workflow
const workflow = new Workflow({ name: 'My First Workflow' });

// Add steps
const step1 = new Step({
  name: 'Fetch Data',
  type: StepTypes.ACTION,
  callable: async (context) => {
    console.log('Fetching data...');
    const data = await fetchData();
    context.data = data;
    return data;
  }
});

const delay = new DelayStep({
  name: 'Wait',
  delay: 1000 // 1 second delay
});

const step2 = new Step({
  name: 'Process Data',
  type: StepTypes.ACTION,
  callable: async (context) => {
    console.log('Processing:', context.data);
    return processData(context.data);
  }
});

workflow.pushStep(step1);
workflow.pushStep(delay);
workflow.pushStep(step2);

// Execute workflow
const result = await workflow.execute();
console.log('Workflow completed:', result);
```

## Core Concepts

### Workflows

Workflows orchestrate the execution of steps in sequence. They manage state, handle errors, and emit lifecycle events throughout execution.

```javascript
const workflow = new Workflow({
  steps: [step1, step2, step3],  // Array of steps
  name: 'My Workflow',            // Name (optional)
  exit_on_failure: true,          // exit_on_failure (default: true)
  sub_step_type_paths: []         // Additional directories for custom steps (default: [])
});
```

**Key Methods:**
- `execute()` - Run the workflow
- `pushStep(step)` - Add a single step
- `pushSteps(steps)` - Add multiple steps
- `addStepAtIndex(step, index)` - Insert step at specific position

### Steps

Steps are the building blocks of workflows. Each step represents a discrete unit of work with its own callable function and lifecycle.

All steps extend the base `Step` class and share common properties:
- `name` - Descriptive name for the step
- `callable` - The function to execute
- `type` - The step type (from StepTypes enum)
- `status` - Current execution status
- `context` - Contextual data snapshot

### State Management

The `State` class manages workflow data:

```javascript
// Accessing state in steps
const step = new Step({
  name: 'Process Data',
  type: StepTypes.ACTION,
  callable: async (context) => {
    // Read from context
    const data = context.previousData;
    
    // Write to context (available for subsequent steps)
    context.result = processData(data);
    
    return context.result;
  }
});

// Get state values
const currentStep = workflow.state.get('current_step');
const allSteps = workflow.state.get('steps');

// Get a deep clone of the entire state
const stateClone = workflow.state.getStateClone();

// Set state values
workflow.state.set('custom_data', { foo: 'bar' });

// Merge data into state
workflow.state.merge({ key1: 'value1', key2: 'value2' });
```

### Events

Both workflows and steps emit events throughout their lifecycle:

**Workflow Events:**
- `WORKFLOW_CANCELLED` - When workflow is cancelled
- `WORKFLOW_COMPLETED` - After successful completion
- `WORKFLOW_CREATED` - When workflow is instantiated
- `WORKFLOW_ERRORED` - When workflow encounters an error
- `WORKFLOW_FAILED` - When workflow fails
- `WORKFLOW_PAUSED` - When workflow is paused
- `WORKFLOW_RESUMED` - When workflow is resumed
- `WORKFLOW_STARTED` - Before execution begins
- `WORKFLOW_STEP_ADDED` - When a step is added
- `WORKFLOW_STEP_MOVED` - When a step is moved
- `WORKFLOW_STEP_REMOVED` - When a step is removed
- `WORKFLOW_STEP_SHIFTED` - When a step is shifted
- `WORKFLOW_STEP_SKIPPED` - When a step is skipped
- `WORKFLOW_STEPS_ADDED` - When multiple steps are added
- `WORKFLOW_STEPS_CLEARED` - When all steps are cleared

**Step Events:**
- `STEP_COMPLETED` - After successful execution
- `STEP_FAILED` - When step fails
- `STEP_RUNNING` - When step execution starts
- `STEP_PENDING` - When step is in pending state
- `STEP_WAITING` - When step is in waiting state
- `DELAY_STEP_ABSOLUTE_COMPLETE` - When absolute delay completes
- `DELAY_STEP_RELATIVE_COMPLETE` - When relative delay completes

### Callables

A callable is an executable entity. This can be any of:
  - Functions
  - Step
  - Workflow

Each can be passed as the callable for any step.

## Step Types

### DelayStep

Add time-based delays to your workflow.

```javascript
import { DelayStep, DelayTypes } from 'micro-flow';

// Relative delay (milliseconds)
const delay1 = new DelayStep({
  name: 'Wait 5 seconds',
  delay: 5000,
  delay_type: DelayTypes.RELATIVE
});

// Absolute delay (Date)
const delay2 = new DelayStep({
  name: 'Wait until midnight',
  delay: new Date('2025-01-01T00:00:00'),
  delay_type: DelayTypes.ABSOLUTE
});

// Cron-based delay
const delay3 = new DelayStep({
  name: 'Wait for next hour',
  delay: '0 * * * *', // Cron expression
  delay_type: DelayTypes.CRON
});
```

### ConditionalStep

Execute different paths based on runtime conditions.

```javascript
import { ConditionalStep, Step, StepTypes, ConditionalStepComparators } from 'micro-flow';

const conditional = new ConditionalStep({
  name: 'Check Value',
  subject: () => context.value,
  operator: ConditionalStepComparators.GREATER_THAN,
  value: 10,
  step_left: new Step({ 
    name: 'If True',
    type: StepTypes.ACTION,
    callable: async () => console.log('Value > 10')
  }),
  step_right: new Step({ 
    name: 'If False',
    type: StepTypes.ACTION,
    callable: async () => console.log('Value <= 10')
  })
});
```

### LoopStep

Iterate with while loops or for-each patterns.

```javascript
import { LoopStep, Workflow, LoopTypes } from 'micro-flow';

// While loop
const whileLoop = new LoopStep({
  name: 'While Loop',
  loop_type: LoopTypes.WHILE,
  subject: () => context.counter,
  operator: '<',
  value: 10,
  sub_workflow: new Workflow({ steps: [...steps] }),
  max_iterations: 20 // Safety limit
});

// For-each loop
// Note: In FOR_EACH loops, access current item via this.parent.state.get('current_item')
const forEachLoop = new LoopStep({
  name: 'For Each Loop',
  loop_type: LoopTypes.FOR_EACH,
  iterable: [1, 2, 3, 4, 5],
  sub_workflow: new Workflow({ steps: [...steps] })
});
```

### SwitchStep

Multi-way branching based on case matching.

```javascript
import { SwitchStep, Case, Step, StepTypes, ConditionalStepComparators } from 'micro-flow';

const switchStep = new SwitchStep({
  name: 'Switch Statement',
  subject: () => context.status,
  cases: [
    new Case({
      subject: Date.now(),
      operator: '>',
      value: 1763308222197,
      callable: new Step({ name: 'Handle Pending', type: StepTypes.ACTION, callable: async () => {} })
    }),
    new Case({
      subject: my_var,
      operator: ConditionalStepComparators.STRICT_EQUALS,
      value: true,
      callable: new Step({ name: 'Handle Completed', type: StepTypes.ACTION, callable: async () => {} })
    })
  ],
  default_step: new Step({ 
    name: 'Handle Default',
    type: StepTypes.ACTION,
    callable: async () => {} 
  })
});
```

### FlowControlStep

Control workflow execution with break, continue, or skip operations.

```javascript
import { FlowControlStep, FlowControlTypes } from 'micro-flow';

const breakStep = new FlowControlStep({
  name: 'Break Loop',
  flow_control_type: FlowControlTypes.BREAK
});

const continueStep = new FlowControlStep({
  name: 'Continue Loop',
  flow_control_type: FlowControlTypes.CONTINUE
});
```

### Skip Step

Conditionally skip the next step

```javascript
import { SkipStep } from micro-flow

const skipStep = new SkipStep({
  subject: my_var,
  operator: '!==',
  value: false,
  name: 'My Skip Step'
});
```

## API Reference

### Classes

| Class | Description | Documentation |
|-------|-------------|---------------|
| `Workflow` | Main workflow orchestrator | [View →](./doc/api/classes/workflow.md) |
| `Step` | Base class for all steps | [View →](./doc/api/classes/step.md) |
| `DelayStep` | Add time delays | [View →](./doc/api/classes/delay-step.md) |
| `ConditionalStep` | Conditional branching | [View →](./doc/api/classes/conditional-step.md) |
| `LoopStep` | Loop iterations | [View →](./doc/api/classes/loop-step.md) |
| `SwitchStep` | Multi-way branching | [View →](./doc/api/classes/switch-step.md) |
| `FlowControlStep` | Flow control operations | [View →](./doc/api/classes/flow-control-step.md) |
| `LogicStep` | Base for logic steps | [View →](./doc/api/classes/logic-step.md) |
| `Case` | Switch case definition | [View →](./doc/api/classes/case.md) |
| `State` | State management | [View →](./doc/api/classes/state.md) |
| `Event` | Base event class | [View →](./doc/api/classes/event.md) |
| `StepEvent` | Step lifecycle events | [View →](./doc/api/classes/step-event.md) |
| `WorkflowEvent` | Workflow lifecycle events | [View →](./doc/api/classes/workflow-event.md) |

### Enums

| Enum | Description |
|------|-------------|
| `StepStatuses` | Step status constants (PENDING, RUNNING, COMPLETED, FAILED, SKIPPED) |
| `StepTypes` | Step type constants (ACTION, DELAY, LOGIC) |
| `StepEventNames` | Step event name constants |
| `WorkflowEventNames` | Workflow event name constants |
| `WorkflowStatuses` | Workflow status constants (CANCELLED, COMPLETED, CREATED, ERRORED, FAILED, PAUSED, PENDING, RUNNING, SKIPPED) |
| `DelayTypes` | Delay type constants (RELATIVE, ABSOLUTE, CRON) |
| `ConditionalStepComparators` | Comparison operators (EQUALS, NOT_EQUALS, GREATER_THAN, etc.) |
| `FlowControlTypes` | Flow control types (BREAK, CONTINUE, SKIP) |
| `LogicStepTypes` | Logic step types (CONDITIONAL, LOOP, SWITCH) |
| `LoopTypes` | Loop iteration types (WHILE, FOR_EACH) |
| `SubStepTypes` | Sub-step type constants |

### Helpers

- `deepClone(obj)` - Deep clone objects safely

## Examples

### Basic Workflow

```javascript
import { Workflow, Step, StepTypes } from 'micro-flow';

const workflow = new Workflow({ name: 'Basic Workflow' });

workflow.pushSteps([
  new Step({
    name: 'Step 1',
    type: StepTypes.ACTION,
    callable: async (context) => {
      context.value = 1;
    }
  }),
  new Step({
    name: 'Step 2',
    type: StepTypes.ACTION,
    callable: async (context) => {
      context.value += 1;
      console.log(context.value); // 2
    }
  })
]);

await workflow.execute();
```

### Conditional Branching

```javascript
import { Workflow, Step, StepTypes, ConditionalStep } from 'micro-flow';

const workflow = new Workflow();

workflow.pushStep(new ConditionalStep({
  name: 'Check User Role',
  subject: () => user.role,
  operator: '===',
  value: 'admin',
  step_left: new Step({
    name: 'Admin Flow',
    type: StepTypes.ACTION,
    callable: async () => handleAdminFlow()
  }),
  step_right: new Step({
    name: 'User Flow',
    type: StepTypes.ACTION,
    callable: async () => handleUserFlow()
  })
}));

await workflow.execute();
```

### Loops

```javascript
import { Workflow, LoopStep, Step, StepTypes, LoopTypes } from 'micro-flow';

const loopBody = new Workflow({
  steps: [
  new Step({
    name: 'Process Item',
    type: StepTypes.ACTION,
    callable: async function(context) {
      // Access current item from the parent loop step
      const currentItem = this.parent.state.get('current_item');
      console.log('Processing:', currentItem);
    }
  })
]
});

const loop = new LoopStep({
  name: 'Process All Items',
  loop_type: LoopTypes.FOR_EACH,
  iterable: ['item1', 'item2', 'item3'],
  sub_workflow: loopBody
});

const workflow = new Workflow({ steps: [loop] });
await workflow.execute();
```

### Nested Workflows

```javascript
import { Workflow, Step, StepTypes } from 'micro-flow';

const subWorkflow = new Workflow({
  name: 'Sub Workflow',
  steps: [
  new Step({
    name: 'Sub Step 1',
    type: StepTypes.ACTION,
    callable: async (context) => {
      context.subResult = 'processed';
    }
  })
]
});

const mainWorkflow = new Workflow({
  steps: [
  new Step({
    name: 'Main Step 1',
    type: StepTypes.ACTION,
    callable: async (context) => {
      context.data = 'initial';
    }
  }),
  new Step({
    name: 'Execute Sub-workflow',
    type: StepTypes.ACTION,
    callable: subWorkflow  // Pass workflow as callable
  }),
  new Step({
    name: 'Main Step 2',
    type: StepTypes.ACTION,
    callable: async (context) => {
      console.log(context.subResult); // 'processed'
    }
  })
]
});

await mainWorkflow.execute();
```

### Error Handling

```javascript
import { Workflow, Step, StepTypes } from 'micro-flow';

// Workflow with exit_on_failure = false
const workflow = new Workflow({ name: 'Resilient Workflow', exit_on_failure: false });

workflow.pushSteps([
  new Step({
    name: 'Step 1',
    type: StepTypes.ACTION,
    callable: async () => {
      throw new Error('This will not stop the workflow');
    }
  }),
  new Step({
    name: 'Step 2',
    type: StepTypes.ACTION,
    callable: async () => {
      console.log('This will still execute');
    }
  })
]);

// Listen for failures
workflow.events.on(workflow.events.event_names.WORKFLOW_STEP_FAILED, (data) => {
  console.error('Step failed:', data.step.name, data.error);
});

await workflow.execute();
```

## Advanced Usage

### Event Listeners

```javascript
import { Workflow, WorkflowEventNames, Step, StepTypes, StepEventNames } from 'micro-flow';

const workflow = new Workflow();

// Listen to workflow events
workflow.events.on(WorkflowEventNames.WORKFLOW_STARTED, (data) => {
  console.log('Workflow started:', data.workflow.name);
});

workflow.events.on(WorkflowEventNames.WORKFLOW_COMPLETED, (data) => {
  console.log('Workflow completed:', data.result);
});

workflow.events.on(WorkflowEventNames.WORKFLOW_FAILED, (data) => {
  console.error('Workflow failed:', data.error);
});

// Listen to step events
const step = new Step({ name: 'My Step', type: StepTypes.ACTION, callable: async () => {} });
step.events.on(StepEventNames.STEP_STARTED, (data) => {
  console.log('Step started:', data.step.name);
});
```

### State Access

```javascript
import { Workflow, Step, StepTypes } from 'micro-flow';

const workflow = new Workflow();

workflow.pushStep(new Step({
  name: 'Work with State',
  type: StepTypes.ACTION,
  callable: async (context) => {
    // Get individual state values
    const currentStep = workflow.state.get('current_step');
    const workflowName = workflow.state.get('name');
    
    // Get the entire state object
    const fullState = workflow.state.getState();
    
    // Get a deep clone of state (safe to modify)
    const stateClone = workflow.state.getStateClone();
    stateClone.custom_property = 'modified';
    
    // Set individual state values
    workflow.state.set('custom_data', { result: 'success' });
    
    // Merge multiple values into state
    workflow.state.merge({
      processed: true,
      timestamp: Date.now()
    });
    
    // Access in subsequent steps
    context.myData = workflow.state.get('custom_data');
  }
}));
```

### Flow Control

```javascript
import { Workflow, LoopStep, FlowControlStep, Step, StepTypes,
         FlowControlTypes, LoopTypes } from 'micro-flow';

const loopBody = new Workflow({
  steps: [
  new Step({
    name: 'Check Condition',
    type: StepTypes.ACTION,
    callable: async (context) => {
      context.shouldBreak = context.counter > 5;
    }
  }),
  new FlowControlStep({
    name: 'Break if needed',
    flow_control_type: FlowControlTypes.BREAK,
    condition: (context) => context.shouldBreak
  }),
  new Step({
    name: 'Increment',
    type: StepTypes.ACTION,
    callable: async (context) => {
      context.counter++;
    }
  })
]
});

const workflow = new Workflow({
  steps: [
    new Step({
      name: 'Initialize',
      type: StepTypes.ACTION,
      callable: async (context) => {
        context.counter = 0;
      }
    }),
    new LoopStep({
      name: 'Controlled Loop',
      loop_type: LoopTypes.WHILE,
      subject: () => true, // Would run forever without break
      operator: '===',
      value: true,
      sub_workflow: loopBody,
      max_iterations: 100
    })
  ]
});

await workflow.execute();
```

## Documentation

Comprehensive documentation is available in the `/doc` folder:

- **[Complete Documentation](./doc/index.md)** - Full documentation index
- **[API Reference](./doc/api/classes/)** - All classes documentation
- **[Core Concepts](./doc/core-concepts/)** - Workflows, Steps, State, Events, and Callables
- **[Enums](./doc/api/enums/)** - All enum references
- **[Helpers](./doc/api/helpers/)** - Helper functions
- **[Examples](./doc/examples/)** - Usage examples

## Testing

The project uses Vitest for testing:

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC

---

**Made with ❤️ for building better workflows**
