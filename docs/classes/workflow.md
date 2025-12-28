# Workflow

Workflow class for managing and executing a sequence of steps.

## Constructor

### `new Workflow(options)`

Creates a new Workflow instance.

**Parameters:**
- `options` (Object) - Configuration options
  - `name` (string, optional) - Name of the workflow
  - `exit_on_error` (boolean, optional) - Whether to exit on error (default: `false`)
  - `steps` (Array, optional) - Array of steps to add to the workflow (default: `[]`)
  - `throw_on_empty` (boolean, optional) - Whether to throw error if workflow is empty (default: `false`)

**Example (Node.js):**
```javascript
import { Workflow, Step } from 'micro-flow';

const workflow = new Workflow({
  name: 'data-processing',
  exit_on_error: true,
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
      }
    })
  ]
});
```

**Example (Browser with React):**
```javascript
import { Workflow, Step } from './micro-flow.js';
import { useState } from 'react';

function DataFetcher() {
  const [data, setData] = useState(null);

  const fetchWorkflow = new Workflow({
    name: 'fetch-user-data',
    steps: [
      new Step({
        name: 'authenticate',
        callable: async () => {
          return await authenticateUser();
        }
      }),
      new Step({
        name: 'fetch',
        callable: async () => {
          const result = await fetch('/api/user');
          const json = await result.json();
          setData(json);
        }
      })
    ]
  });

  return (
    <button onClick={() => fetchWorkflow.execute()}>
      Fetch Data
    </button>
  );
}
```

## Properties

- `results` (Array) - Array of execution results
- `exit_on_error` (boolean) - Whether to exit on error
- `current_step` (string|null) - ID of the currently executing step
- `should_break` (boolean) - Flag to break workflow execution
- `should_continue` (boolean) - Flag to continue workflow execution
- `should_pause` (boolean) - Flag to pause workflow execution
- `should_skip` (boolean) - Flag to skip current step
- `status` (string) - Current workflow status
- `steps` (Array) - Array of steps in the workflow
- `steps_by_id` (Object) - Map of steps by their ID
- `throw_on_empty` (boolean) - Whether to throw on empty workflow

## Methods

### `async execute()`

Executes the workflow by running all steps in sequence.

**Returns:** Promise\<Workflow\> - The workflow instance with execution results

**Throws:** Error if workflow is empty and throw_on_empty is true

**Example (Node.js):**
```javascript
const workflow = new Workflow({
  name: 'email-workflow',
  steps: [
    new Step({ name: 'validate-email', callable: async () => true }),
    new Step({ name: 'send-email', callable: async () => 'sent' })
  ]
});

const result = await workflow.execute();
console.log('Workflow complete:', result.results);
```

**Example (Browser with Vue):**
```vue
<template>
  <div>
    <button @click="runWorkflow">Run Workflow</button>
    <div v-if="status">Status: {{ status }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Workflow, Step } from './micro-flow.js';

const status = ref('');

const workflow = new Workflow({
  name: 'form-submission',
  steps: [
    new Step({
      name: 'validate',
      callable: async () => {
        status.value = 'Validating...';
        return true;
      }
    }),
    new Step({
      name: 'submit',
      callable: async () => {
        status.value = 'Submitting...';
        await fetch('/api/submit', { method: 'POST' });
      }
    })
  ]
});

const runWorkflow = async () => {
  await workflow.execute();
  status.value = 'Complete!';
};
</script>
```

---

### `async resume()`

Resumes a paused workflow.

**Returns:** Promise\<Workflow\> - The workflow instance

**Example (Node.js):**
```javascript
const workflow = new Workflow({ name: 'pauseable' });
// ... workflow pauses during execution
await workflow.resume();
```

---

### `async step()`

Executes a single step in the workflow.

**Returns:** Promise\<any\> - The result of the step execution

---

### `addStep(step)`

Adds a step to the workflow.

**Parameters:**
- `step` (Step) - The step to add

**Throws:** Error if step is not a valid Step instance

**Example (Browser):**
```javascript
const workflow = new Workflow({ name: 'dynamic' });
workflow.addStep(new Step({
  name: 'dynamic-step',
  callable: async () => console.log('Added dynamically')
}));
```

---

### `addStepAtIndex(step, index)`

Adds a step at a specific index in the workflow.

**Parameters:**
- `step` (Step) - The step to add
- `index` (number) - The index at which to insert the step

---

### `addSteps(steps)`

Adds multiple steps to the workflow.

**Parameters:**
- `steps` (Array\<Step\>) - Array of steps to add

**Example (Node.js):**
```javascript
const steps = [
  new Step({ name: 'step1', callable: async () => {} }),
  new Step({ name: 'step2', callable: async () => {} })
];
workflow.addSteps(steps);
```

---

### `clearSteps()`

Clears all steps from the workflow.

---

### `deleteStep(stepId)`

Deletes a step from the workflow by its ID.

**Parameters:**
- `stepId` (string) - The ID of the step to delete

---

### `deleteStepByIndex(index)`

Deletes a step from the workflow by its index.

**Parameters:**
- `index` (number) - The index of the step to delete

---

### `initializeWorkflowState()`

Initializes the workflow state with default values.

---

### `isEmpty()`

Checks if the workflow has no steps.

**Returns:** boolean - True if the workflow is empty

---

### `markAsCreated()`

Marks the workflow as created.

**Returns:** string - The CREATED status

---

### `markAsPaused()`

Marks the workflow as paused.

---

### `markAsResumed()`

Marks the workflow as resumed.

---

### `moveStep(fromIndex, toIndex)`

Moves a step from one index to another.

**Parameters:**
- `fromIndex` (number) - The current index of the step
- `toIndex` (number) - The target index for the step

---

### `pause()`

Pauses the workflow execution.

**Example (Browser):**
```javascript
const longWorkflow = new Workflow({
  name: 'long-process',
  steps: [/* many steps */]
});

// Start execution
longWorkflow.execute();

// Pause after some condition
setTimeout(() => {
  longWorkflow.pause();
}, 5000);
```

---

### `popStep()`

Removes and returns the last step from the workflow.

**Returns:** Step - The last step

---

### `prepareResult(message, data)`

Prepares a result object and adds it to the results array.

**Parameters:**
- `message` (string) - Result message
- `data` (any) - Result data

---

### `pushStep(step)`

Adds a step to the end of the workflow.

**Parameters:**
- `step` (Step) - The step to add

---

### `pushSteps(steps)`

Adds multiple steps to the end of the workflow.

**Parameters:**
- `steps` (Array\<Step\>) - Array of steps to add

---

### `shiftStep()`

Removes and returns the first step from the workflow.

**Returns:** Step - The first step

---

### `unshiftStep(step)`

Adds a step to the beginning of the workflow.

**Parameters:**
- `step` (Step) - The step to add

**Throws:** Error if step is not a valid Step instance

## See Also

- [Step](steps/step.md) - Individual workflow steps
- [FlowControlStep](steps/flow_control_step.md) - Control workflow execution
