# Step

**Base class representing a workflow step with lifecycle management and event handling.**

## Overview

The `Step` class is the foundation for all step types in the workflow system. It provides lifecycle management, event handling, status tracking, and execution capabilities.

## Class Definition

```javascript
class Step
```

**Extends:** None  
**Location:** `src/classes/step.js`

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `events` | `StepEvents` | `new StepEvents()` | Event handler for step-related events |
| `status` | `string` | `step_statuses.WAITING` | Current status of the step |
| `step_types` | `Object` | `step_types` | Reference to step types enum |
| `sub_step_types` | `Object` | `sub_step_types` | Reference to sub-step types enum |
| `context` | `Object` | `{}` | Execution context containing workflow state |
| `id` | `string` | `randomUUID()` | Unique identifier for the step |
| `name` | `string` | - | Name of the step |
| `type` | `string` | - | Type of the step (from step_types enum) |
| `callable` | `Function\|Step\|Workflow` | `async () => {}` | Function to execute for this step |
| `log_suppress` | `boolean` | `false` | Whether to suppress logging |

## Constructor

### `constructor(options)`

Creates a new Step instance.

**Parameters:**

- `options` (Object) - Configuration options for the step
  - `name` (string) - The name of the step
  - `type` (string) - The type of the step (from step_types enum)
  - `callable` (Function|Step|Workflow) *[optional]* - The async function to execute for this step (default: `async()=>{}`)
  - `log_suppress` (boolean) *[optional]* - Whether to suppress logging for this step (default: `false`)

**Example:**

```javascript
const step = new Step({
  name: 'My Step',
  type: step_types.ACTION,
  callable: async (context) => {
    console.log('Executing step');
    return 'result';
  }
});
```

## Methods

### `execute()`

Executes the step's callable function with any provided arguments.

**Returns:** `Promise<*>` - The result of the callable function

**Throws:** `Error` - If the callable function throws an error during execution

**Async:** Yes

**Example:**

```javascript
const result = await step.execute();
```

---

### `logStep(message)`

Logs step status information to the console unless logging is suppressed. Failed steps are logged as errors, all others as standard logs.

**Parameters:**

- `message` (string) *[optional]* - Optional custom message to log. If not provided, uses default status message

**Returns:** `void`

**Example:**

```javascript
step.logStep('Custom log message');
```

---

### `markAsComplete()`

Marks the step as complete and logs the status change.

**Returns:** `void`

**Emits:** `STEP_COMPLETED` event with payload `{ step: this }`

**Example:**

```javascript
step.markAsComplete();
```

---

### `markAsFailed(error)`

Marks the step as failed and logs the status change with error details.

**Parameters:**

- `error` (Error) - The error that caused the step to fail

**Returns:** `void`

**Emits:** `STEP_FAILED` event with payload `{ step: this, error }`

**Example:**

```javascript
try {
  await step.execute();
} catch (error) {
  step.markAsFailed(error);
}
```

---

### `markAsWaiting()`

Marks the step as waiting and logs the status change.

**Returns:** `void`

**Emits:** `STEP_WAITING` event with payload `{ step: this }`

---

### `markAsPending()`

Marks the step as pending and logs the status change.

**Returns:** `void`

**Emits:** `STEP_PENDING` event with payload `{ step: this }`

---

### `markAsRunning()`

Marks the step as running and logs the status change.

**Returns:** `void`

**Emits:** `STEP_RUNNING` event with payload `{ step: this }`

---

### `setEvents(events)`

Sets a custom events object for this step.

**Parameters:**

- `events` (StepEvents) - The StepEvents instance to use for this step

**Returns:** `void`

**Throws:** `Error` - Throws an error if the provided events object is invalid

**Example:**

```javascript
const customEvents = new StepEvents();
step.setEvents(customEvents);
```

---

### `setContext(state)`

Sets the execution context for this step. Provides a snapshot of the workflow state at the time of execution. The context is an object containing state information accessible during step execution. Also creates a mapping of steps by their IDs for easy access.

**Parameters:**

- `state` (Object) - The state object to set as the context

**Returns:** `void`

**Example:**

```javascript
const state = { steps: [], current_step: null };
step.setContext(state);
```

## Usage Example

```javascript
import { Step, step_types } from './classes';

// Create a simple step
const myStep = new Step({
  name: 'Process Data',
  type: step_types.ACTION,
  callable: async (context) => {
    console.log('Processing data...');
    return { processed: true };
  }
});

// Execute the step
try {
  const result = await myStep.execute();
  console.log('Result:', result);
} catch (error) {
  console.error('Step failed:', error);
}
```

## Related Classes

- [DelayStep](../step-types/DelayStep.md) - Step for adding delays
- [LogicStep](../logic-steps/LogicStep.md) - Base class for logic-based steps
