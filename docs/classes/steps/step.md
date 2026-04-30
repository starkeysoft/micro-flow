# Step

Orchestrate individual units of work with built-in resilience. Every step provides first-class support for retries, timeouts, and state management.

## Constructor

### `new Step(options)`

Initializes a new Step instance.

**Parameters:**
- `options` (Object) - Configuration options
  - `name` (string, optional) - Unique name of the step.
  - `callable` (Function|Step|Workflow) - Function, Step, or Workflow to execute (default: `async () => {}`).
  - `max_retries` (number, optional) - Maximum number of retries on failure (default: `0`).
  - `max_timeout_ms` (number, optional) - Maximum execution time in milliseconds before timing out (default: `30000`).
  - `step_type` (string, optional) - Type of the step (default: `step_types.ACTION`).
  - `sub_step_type` (sub_step_types|null, optional) - Sub-type of the step from the `sub_step_types` enum (default: `null`).

**Example (Node.js):**
```javascript
import { Step } from 'micro-flow';
import fs from 'fs/promises';

const fileStep = new Step({
  name: 'read-file',
  callable: async () => {
    return await fs.readFile('./data.txt', 'utf-8');
  }
});

const result = await fileStep.execute();
console.log('File content:', result.result);
```

## Methods

### `async execute()`

Executes the step's logic.

The engine races the callable against the `max_timeout_ms` timer. If the step fails and `max_retries > 0`, execution is retried automatically. If `exit_on_error` is set in the global State, a failure will throw.

**Returns:** Promise\<Step\> - The step instance with execution results. If the callable was a `Step` or `Workflow`, returns that object directly.
