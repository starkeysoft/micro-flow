# Step

Step class representing an executable unit within a workflow.

## Constructor

### `new Step(options)`

Creates a new Step instance.

**Parameters:**
- `options` (Object) - Configuration options
  - `name` (string, optional) - Name of the step
  - `step_type` (string, optional) - Type of the step (default: `step_types.ACTION`)
  - `callable` (Function|Step|Workflow, optional) - Function, Step, or Workflow to execute (default: `async () => {}`)
  - `sub_step_type` (string|null, optional) - Sub-type of the step (default: `null`)

**Example (Node.js):**
```javascript
import { Step } from 'micro-flow';
import fs from 'fs/promises';

const fileStep = new Step({
  name: 'read-file',
  callable: async () => {
    const content = await fs.readFile('./data.txt', 'utf-8');
    return content;
  }
});

const result = await fileStep.execute();
console.log('File content:', result.result);
```

**Example (Browser):**
```javascript
import { Step } from './micro-flow.js';

const apiStep = new Step({
  name: 'fetch-users',
  callable: async () => {
    const response = await fetch('/api/users');
    return response.json();
  }
});

await apiStep.execute();
```

**Example (Node.js - Nested Step):**
```javascript
import { Step, Workflow } from 'micro-flow';

// A step that executes another workflow
const nestedWorkflow = new Workflow({
  name: 'sub-workflow',
  steps: [
    new Step({ name: 'sub-task-1', callable: async () => 'done' })
  ]
});

const parentStep = new Step({
  name: 'parent-step',
  callable: nestedWorkflow // Execute workflow as step
});
```

## Properties

- `callable` (Function) - The function to execute
- `callable_type` (string) - Type of callable: 'function', 'step', or 'workflow'
- `step_type` (string) - Type of the step
- `sub_step_type` (string|null) - Sub-type of the step
- `errors` (Array) - Array of errors encountered during execution
- `result` (any) - Result of the step execution
- `retry_results` (Array) - Array of retry attempt results

## Methods

### `async execute()`

Executes the step's callable function, Step, or Workflow.

**Returns:** Promise\<Step\> - The step instance with execution results

**Example (Node.js - Database Operation):**
```javascript
import { Step } from 'micro-flow';
import { db } from './database.js';

const insertStep = new Step({
  name: 'insert-record',
  callable: async () => {
    const result = await db.query(
      'INSERT INTO users (name, email) VALUES ($1, $2)',
      ['John Doe', 'john@example.com']
    );
    return result;
  }
});

try {
  const stepResult = await insertStep.execute();
  console.log('Insert successful:', stepResult.result);
} catch (error) {
  console.error('Insert failed:', stepResult.errors);
}
```

**Example (Browser with React):**
```javascript
import { Step } from './micro-flow.js';
import { useState } from 'react';

function TaskRunner() {
  const [status, setStatus] = useState('');
  const [result, setResult] = useState(null);

  const runStep = async () => {
    const step = new Step({
      name: 'api-call',
      callable: async () => {
        setStatus('Running...');
        const response = await fetch('/api/task');
        const data = await response.json();
        return data;
      }
    });

    const stepResult = await step.execute();
    setStatus('Complete');
    setResult(stepResult.result);
  };

  return (
    <div>
      <button onClick={runStep}>Run Step</button>
      <p>Status: {status}</p>
      <pre>{JSON.stringify(result, null, 2)}</pre>
    </div>
  );
}
```

**Example (Browser with Vue):**
```vue
<template>
  <div>
    <button @click="executeTask">Execute Task</button>
    <div v-if="taskResult">Result: {{ taskResult }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Step } from './micro-flow.js';

const taskResult = ref(null);

const executeTask = async () => {
  const step = new Step({
    name: 'background-task',
    callable: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { status: 'success', timestamp: Date.now() };
    }
  });

  const result = await step.execute();
  taskResult.value = result.result;
};
</script>
```

---

### `getCallableType(callable)`

Determines the type of the callable (function, step, or workflow).

**Parameters:**
- `callable` (Function|Step|Workflow) - The callable to check

**Returns:** string - The type: 'function', 'step', or 'workflow'

**Throws:** Error if callable type is invalid

**Example (Node.js):**
```javascript
import { Step, Workflow } from 'micro-flow';

const step = new Step({ name: 'test' });

console.log(step.getCallableType(() => {})); // 'function'
console.log(step.getCallableType(new Step({}))); // 'step'
console.log(step.getCallableType(new Workflow({}))); // 'workflow'
```

## Common Patterns

### Error Handling

**Node.js:**
```javascript
import { Step, State } from 'micro-flow';

State.set('exit_on_error', false);

const riskyStep = new Step({
  name: 'might-fail',
  callable: async () => {
    if (Math.random() > 0.5) {
      throw new Error('Random failure');
    }
    return 'success';
  }
});

const result = await riskyStep.execute();
if (result.errors.length > 0) {
  console.error('Step failed:', result.errors);
} else {
  console.log('Step succeeded:', result.result);
}
```

### Data Transformation Pipeline

**Node.js:**
```javascript
import { Step, Workflow } from 'micro-flow';

const pipeline = new Workflow({
  name: 'data-pipeline',
  steps: [
    new Step({
      name: 'extract',
      callable: async () => {
        return await fetchRawData();
      }
    }),
    new Step({
      name: 'transform',
      callable: async () => {
        const raw = State.get('pipeline.raw');
        return transformData(raw);
      }
    }),
    new Step({
      name: 'load',
      callable: async () => {
        const transformed = State.get('pipeline.transformed');
        await saveToDatabase(transformed);
      }
    })
  ]
});
```

### Async API Calls (Browser)

**React with Multiple Steps:**
```javascript
import { Step } from './micro-flow.js';
import { useState } from 'react';

function MultiStepForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({});

  const steps = [
    new Step({
      name: 'validate-email',
      callable: async () => {
        const response = await fetch('/api/validate-email', {
          method: 'POST',
          body: JSON.stringify({ email: formData.email })
        });
        return response.json();
      }
    }),
    new Step({
      name: 'create-account',
      callable: async () => {
        const response = await fetch('/api/register', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        return response.json();
      }
    }),
    new Step({
      name: 'send-welcome-email',
      callable: async () => {
        await fetch('/api/send-welcome');
      }
    })
  ];

  const executeStep = async (index) => {
    await steps[index].execute();
    setCurrentStep(index + 1);
  };

  return <div>/* Form UI */</div>;
}
```

## See Also

- [Workflow](../workflow.md) - Container for steps
- [ConditionalStep](conditional_step.md) - Step with branching logic
- [LogicStep](logic_step.md) - Step with conditional evaluation
- [FlowControlStep](flow_control_step.md) - Control flow execution
