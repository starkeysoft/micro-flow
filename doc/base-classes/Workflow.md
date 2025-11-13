# Workflow

**Represents a workflow that manages and executes a sequence of steps.**

## Overview

The `Workflow` class orchestrates the execution of multiple steps in sequence, managing their lifecycle, state, and events. It provides methods for adding, removing, and manipulating steps, as well as executing the entire workflow.

## Class Definition

```javascript
class Workflow
```

**Extends:** None  
**Location:** `src/classes/workflow.js`

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `events` | `WorkflowEvents` | `new WorkflowEvents()` | Event handler for workflow events |
| `state` | `State` | `new WorkflowState()` | Workflow state manager |

## Constructor

### `constructor(steps, name, exit_on_failure)`

Creates a new Workflow instance.

**Parameters:**

- `steps` (Array) *[optional]* - An array of step objects to be executed in the workflow (default: `[]`)
- `name` (string) *[optional]* - Optional name for the workflow. If not provided, generates a unique name (default: `null`)
- `exit_on_failure` (boolean) *[optional]* - Whether to exit the workflow when a step fails (default: `true`)

**Emits:** `WORKFLOW_CREATED` event with payload `{ workflow: this.state }`

**Example:**

```javascript
const workflow = new Workflow(
  [step1, step2, step3],
  'My Workflow',
  true
);
```

## Methods

### `pushStep(step)`

Adds a single step to the end of the workflow.

**Parameters:**

- `step` (Object) - The step object to add to the workflow

**Returns:** `void`

**Emits:** `WORKFLOW_STEP_ADDED` event with payload `{ workflow: this.state, step }`

**Example:**

```javascript
workflow.pushStep(newStep);
```

---

### `pushSteps(steps)`

Adds multiple steps to the end of the workflow.

**Parameters:**

- `steps` (Array) - An array of step objects to add to the workflow

**Returns:** `void`

**Emits:** `WORKFLOW_STEPS_ADDED` event with payload `{ workflow: this.state, steps }`

**Example:**

```javascript
workflow.pushSteps([step1, step2, step3]);
```

---

### `clearSteps()`

Removes all steps from the workflow.

**Returns:** `void`

**Emits:** `WORKFLOW_STEPS_CLEARED` event with payload `{ workflow: this.state }`

**Example:**

```javascript
workflow.clearSteps();
```

---

### `execute(initialState)`

Executes all steps in the workflow sequentially until completion or error. Tracks execution time and stores it in `execution_time_ms`.

**Parameters:**

- `initialState` (Object) *[optional]* - Optional initial state to merge before execution (default: `null`)

**Returns:** `Promise<State>` - The final workflow state after execution

**Throws:** `Error` - If any step in the workflow throws an error during execution and exit_on_failure is true

**Async:** Yes

**Emits:**
- `WORKFLOW_STARTED` event with payload `{ workflow: this.state }` when execution begins
- `WORKFLOW_ERRORED` event with payload `{ workflow: this.state, error }` when an error occurs
- `WORKFLOW_COMPLETED` event with payload `{ workflow: this.state }` when execution completes successfully

**Note:** The workflow state is prepared with `execution_time_ms` calculated and frozen after execution.

**Example:**

```javascript
const initialState = { user: 'john', data: [] };
const finalState = await workflow.execute(initialState);
console.log('Workflow completed:', finalState);
```

---

### `getSteps()`

Retrieves all steps in the workflow.

**Returns:** `Array` - An array of all step objects in the workflow

**Example:**

```javascript
const allSteps = workflow.getSteps();
```

---

### `isEmpty()`

Checks if the workflow has no steps.

**Returns:** `boolean` - True if the workflow is empty, false otherwise

**Example:**

```javascript
if (workflow.isEmpty()) {
  console.log('No steps to execute');
}
```

---

### `moveStep(fromIndex, toIndex)`

Moves a step from one position to another in the workflow.

**Parameters:**

- `fromIndex` (number) - The index of the step to move
- `toIndex` (number) - The destination index where the step should be placed

**Returns:** `Array` - The result of the splice operation

**Emits:** `WORKFLOW_STEP_MOVED` event with payload `{ workflow: this.state, movedStep }`

**Example:**

```javascript
workflow.moveStep(0, 2); // Move first step to third position
```

---

### `removeStep(index)`

Removes a step from the workflow at the specified index.

**Parameters:**

- `index` (number) - The index of the step to remove

**Returns:** `Array` - An array containing the removed step

**Emits:** `WORKFLOW_STEP_REMOVED` event with payload `{ workflow: this.state, removedStep }`

**Example:**

```javascript
const removed = workflow.removeStep(1);
```

---

### `shiftStep()`

Removes and returns the first step from the workflow.

**Returns:** `Object|undefined` - The first step object, or undefined if the workflow is empty

**Emits:** `WORKFLOW_STEP_SHIFTED` event with payload `{ workflow: this.state, shiftedStep }`

**Example:**

```javascript
const firstStep = workflow.shiftStep();
```

---

### `step()`

Executes the next step in the workflow. Removes the first step from the workflow, marks its status, executes it, and handles errors. DELAY type steps are marked as pending, all other steps are marked as running.

**Returns:** `Promise<*>` - The result of executing the step

**Throws:** `Error` - Throws an error if the workflow is empty or if a step execution fails

**Async:** Yes

**Example:**

```javascript
const result = await workflow.step();
```

## Usage Example

```javascript
import { Workflow, ActionStep } from './classes';

// Create steps
const step1 = new ActionStep({
  name: 'Initialize',
  callable: async (context) => {
    console.log('Initializing...');
    return { initialized: true };
  }
});

const step2 = new ActionStep({
  name: 'Process',
  callable: async (context) => {
    console.log('Processing...');
    return { processed: true };
  }
});

// Create workflow
const workflow = new Workflow(
  [step1, step2],
  'Data Processing Workflow',
  true
);

// Execute workflow
try {
  const finalState = await workflow.execute({ input: 'data' });
  console.log('Workflow completed successfully:', finalState);
} catch (error) {
  console.error('Workflow failed:', error);
}

// Add more steps dynamically
workflow.pushStep(step3);
```

## Events

The Workflow class emits the following events:

- `WORKFLOW_CREATED` - Emitted when a workflow is created
- `WORKFLOW_STARTED` - Emitted when workflow execution begins
- `WORKFLOW_COMPLETED` - Emitted when workflow execution completes successfully
- `WORKFLOW_ERRORED` - Emitted when an error occurs during execution
- `WORKFLOW_STEP_ADDED` - Emitted when a step is added
- `WORKFLOW_STEPS_ADDED` - Emitted when multiple steps are added
- `WORKFLOW_STEPS_CLEARED` - Emitted when all steps are cleared
- `WORKFLOW_STEP_MOVED` - Emitted when a step is moved
- `WORKFLOW_STEP_REMOVED` - Emitted when a step is removed
- `WORKFLOW_STEP_SHIFTED` - Emitted when a step is shifted

## Related Classes

- [State](../utilities/State.md) - Manages workflow state
- [WorkflowEvent](../events/WorkflowEvent.md) - Handles workflow events
- [Step](Step.md) - Base step class
