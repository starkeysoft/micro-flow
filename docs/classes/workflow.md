# Workflow

Manage and execute complex logic sequences with precision. Workflows act as the primary engine for coordinating multiple steps, handling errors, and managing stateful transitions.

## Constructor

### `new Workflow(options)`

Initializes a new Workflow instance.

**Parameters:**
- `options` (Object) - Configuration options
  - `name` (string, optional) - Unique name for identification and logging.
  - `exit_on_error` (boolean, optional) - Halt the entire workflow if any step fails (default: `false`).
  - `steps` (Array, optional) - Initial collection of steps (default: `[]`).
  - `throw_on_empty` (boolean, optional) - Force an error if execution is attempted without steps (default: `false`).

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

## Methods

### `async execute()`

Executes the workflow by running all steps in sequence.

**Returns:** Promise\<Workflow\> - Resolves with the workflow instance upon completion.

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
console.log('Workflow complete!', result.results);
```
