# step_statuses Enum

Defines the execution states for steps throughout their lifecycle.

## Values

| Constant | Value | Description |
|----------|-------|-------------|
| `PENDING` | `'pending'` | Step created but not yet executed |
| `RUNNING` | `'running'` | Step is currently executing |
| `COMPLETED` | `'completed'` | Step finished successfully |
| `FAILED` | `'failed'` | Step encountered an error |
| `CANCELLED` | `'cancelled'` | Step execution was cancelled |
| `TIMEOUT` | `'timeout'` | Step exceeded its timeout limit |

## Import

```javascript
import { StepStatuses } from 'micro-flow';
// or
import StepStatuses from 'micro-flow/enums/step_statuses';
```

## Status Lifecycle

```
PENDING → RUNNING → COMPLETED
                 ↘ FAILED
                 ↘ CANCELLED
                 ↘ TIMEOUT
```

## Usage

### Checking Step Status

```javascript
import { Step, StepStatuses } from 'micro-flow';

const step = new Step({
  name: 'Process',
  type: StepTypes.ACTION,
  callable: async () => processData()
});

console.log(step.state.get('status')); // 'pending'

await step.execute();

if (step.state.get('status') === StepStatuses.COMPLETED) {
  console.log('Step completed successfully');
} else if (step.state.get('status') === StepStatuses.FAILED) {
  console.error('Step failed:', step.state.get('error'));
}
```

### Event-Based Status Monitoring

```javascript
step.events.on('STEP_STARTED', () => {
  console.log(step.state.get('status')); // 'running'
});

step.events.on('STEP_COMPLETED', () => {
  console.log(step.state.get('status')); // 'completed'
});

step.events.on('STEP_FAILED', () => {
  console.log(step.state.get('status')); // 'failed'
});

step.events.on('STEP_TIMEOUT', () => {
  console.log(step.state.get('status')); // 'timeout'
});
```

### Filtering by Status

```javascript
const workflow = new Workflow({ name: 'My Workflow' });
await workflow.execute();

// Get all completed steps
const completedSteps = workflow.getSteps().filter(
  step => step.state.get('status') === StepStatuses.COMPLETED
);

// Get all failed steps
const failedSteps = workflow.getSteps().filter(
  step => step.state.get('status') === StepStatuses.FAILED
);

console.log(`${completedSteps.length} completed, ${failedSteps.length} failed`);
```

## Status Descriptions

### PENDING
- **Set:** When step is created
- **Meaning:** Step is initialized but has not started executing
- **Next States:** RUNNING, CANCELLED

```javascript
const step = new Step({ /* config */ });
console.log(step.state.get('status')); // 'pending'
```

### RUNNING
- **Set:** When step.execute() begins
- **Meaning:** Step callable is currently executing
- **Next States:** COMPLETED, FAILED, TIMEOUT, CANCELLED

```javascript
step.events.on('STEP_STARTED', () => {
  console.log('Status:', step.state.get('status')); // 'running'
});
```

### COMPLETED
- **Set:** When callable returns successfully
- **Meaning:** Step finished without errors
- **Final State:** Yes

```javascript
await step.execute();
if (step.state.get('status') === StepStatuses.COMPLETED) {
  const result = step.state.get('result');
  console.log('Result:', result);
}
```

### FAILED
- **Set:** When callable throws an error (after all retries)
- **Meaning:** Step encountered an unrecoverable error
- **Final State:** Yes

```javascript
const step = new Step({
  callable: async () => {
    throw new Error('Something went wrong');
  },
  max_retries: 3
});

await step.execute().catch(() => {});
console.log(step.state.get('status')); // 'failed'
console.log(step.state.get('error')); // Error object
```

### CANCELLED
- **Set:** When step execution is cancelled (implementation-specific)
- **Meaning:** Step was stopped before completion
- **Final State:** Yes

### TIMEOUT
- **Set:** When step exceeds timeout_ms limit
- **Meaning:** Step took too long to execute
- **Final State:** Yes

```javascript
const step = new Step({
  callable: async () => {
    await new Promise(resolve => setTimeout(resolve, 10000));
  },
  timeout_ms: 5000
});

await step.execute().catch(() => {});
console.log(step.state.get('status')); // 'timeout'
```

## Complete Example

```javascript
import { 
  Workflow,
  Step,
  StepTypes,
  StepStatuses
} from 'micro-flow';

async function runWorkflowWithMonitoring() {
  const workflow = new Workflow({ name: 'Monitored Workflow' });
  
  workflow.pushSteps([
    new Step({
      name: 'Step 1',
      type: StepTypes.ACTION,
      callable: async () => ({ success: true })
    }),
    new Step({
      name: 'Step 2',
      type: StepTypes.ACTION,
      callable: async () => {
        throw new Error('Intentional failure');
      },
      max_retries: 2
    }),
    new Step({
      name: 'Step 3',
      type: StepTypes.ACTION,
      callable: async () => ({ success: true }),
      timeout_ms: 1000
    })
  ]);
  
  await workflow.execute().catch(() => {});
  
  // Check status of each step
  const steps = workflow.getSteps();
  
  steps.forEach((step, index) => {
    const status = step.state.get('status');
    const name = step.state.get('name');
    
    console.log(`${name}: ${status}`);
    
    if (status === StepStatuses.COMPLETED) {
      console.log('  Result:', step.state.get('result'));
    } else if (status === StepStatuses.FAILED) {
      console.log('  Error:', step.state.get('error').message);
    } else if (status === StepStatuses.TIMEOUT) {
      console.log('  Timed out after', step.state.get('timeout_ms'), 'ms');
    }
  });
  
  // Summary
  const statusCounts = steps.reduce((acc, step) => {
    const status = step.state.get('status');
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  
  console.log('Summary:', statusCounts);
  // Example: { completed: 1, failed: 1, pending: 1 }
}
```

## Status Transitions

| From | To | Trigger |
|------|-----|---------|
| PENDING | RUNNING | execute() called |
| RUNNING | COMPLETED | Callable returns successfully |
| RUNNING | FAILED | Callable throws error (after retries) |
| RUNNING | TIMEOUT | Execution exceeds timeout_ms |
| RUNNING | CANCELLED | Cancellation requested |
| PENDING | CANCELLED | Cancellation before execution |

## See Also

- [Step Class](../classes/step.md)
- [workflow_statuses Enum](./workflow-statuses.md)
- [step_types Enum](./step-types.md)
- [step_event_names Enum](./step-event-names.md)
