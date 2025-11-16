# workflow_statuses Enum

Defines the execution states for workflows throughout their lifecycle.

## Values

| Constant | Value | Description |
|----------|-------|-------------|
| `PENDING` | `'pending'` | Workflow created but not started |
| `RUNNING` | `'running'` | Workflow is executing steps |
| `COMPLETED` | `'completed'` | All steps finished successfully |
| `FAILED` | `'failed'` | Workflow stopped due to step failure |
| `CANCELLED` | `'cancelled'` | Workflow execution was cancelled |
| `PAUSED` | `'paused'` | Workflow execution is paused |
| `RESUMED` | `'resumed'` | Workflow resumed after pause |
| `FROZEN` | `'frozen'` | Workflow state is frozen (immutable) |

## Import

```javascript
import { WorkflowStatuses } from 'micro-flow';
// or
import WorkflowStatuses from 'micro-flow/enums/workflow_statuses';
```

## Status Lifecycle

```
PENDING → RUNNING → COMPLETED
              ↓
            PAUSED → RESUMED → RUNNING
              ↓
           FAILED
              ↓
         CANCELLED

FROZEN (final state modifier)
```

## Usage

### Checking Workflow Status

```javascript
import { Workflow, WorkflowStatuses } from 'micro-flow';

const workflow = new Workflow({ name: 'My Workflow' });
console.log(workflow.state.get('status')); // 'pending'

await workflow.execute();

if (workflow.state.get('status') === WorkflowStatuses.COMPLETED) {
  console.log('Workflow completed successfully');
}
```

### Event-Based Status Monitoring

```javascript
workflow.events.on('WORKFLOW_STARTED', () => {
  console.log(workflow.state.get('status')); // 'running'
});

workflow.events.on('WORKFLOW_COMPLETED', () => {
  console.log(workflow.state.get('status')); // 'completed' or 'frozen'
});

workflow.events.on('WORKFLOW_PAUSED', () => {
  console.log(workflow.state.get('status')); // 'paused'
});

workflow.events.on('WORKFLOW_RESUMED', () => {
  console.log(workflow.state.get('status')); // 'resumed'
});
```

### Conditional Execution Based on Status

```javascript
if (workflow.state.get('status') === WorkflowStatuses.PAUSED) {
  await workflow.resume();
} else if (workflow.state.get('status') === WorkflowStatuses.PENDING) {
  await workflow.execute();
}
```

## Status Descriptions

### PENDING
- **Set:** When workflow is created
- **Meaning:** Workflow exists but execute() hasn't been called
- **Next States:** RUNNING, EMPTY, CANCELLED

```javascript
const workflow = new Workflow({ name: 'Test' });
console.log(workflow.state.get('status')); // 'pending'
```

### RUNNING
- **Set:** When execute() starts
- **Meaning:** Workflow is actively executing steps
- **Next States:** COMPLETED, FAILED, PAUSED, CANCELLED

```javascript
await workflow.execute();
// During execution: status is 'running'
```

### COMPLETED
- **Set:** When all steps finish successfully
- **Meaning:** Workflow executed all steps without errors
- **Final State:** Yes (may transition to FROZEN)

```javascript
await workflow.execute();
console.log(workflow.state.get('status')); // 'completed' or 'frozen'
```

### FAILED
- **Set:** When a step fails and exit_on_failure is true
- **Meaning:** Workflow stopped due to step error
- **Final State:** Yes

```javascript
const workflow = new Workflow({
  steps: [failingStep],
  exit_on_failure: true
});

await workflow.execute().catch(() => {});
console.log(workflow.state.get('status')); // 'failed'
```

### CANCELLED
- **Set:** When workflow is cancelled (implementation-specific)
- **Meaning:** Workflow execution was intentionally stopped
- **Final State:** Yes

### PAUSED
- **Set:** When pause() is called and current step completes
- **Meaning:** Workflow is paused between steps
- **Next States:** RESUMED, CANCELLED

```javascript
workflow.pause();
await workflow.execute();
// After current step finishes: status is 'paused'
```

### RESUMED
- **Set:** When resume() is called on a paused workflow
- **Meaning:** Workflow is resuming execution
- **Next States:** RUNNING

```javascript
await workflow.resume();
console.log(workflow.state.get('status')); // 'resumed' then 'running'
```

### EMPTY
- **Set:** When execute() is called but workflow has no steps
- **Meaning:** Workflow cannot execute (no steps defined)
- **Special:** Not a typical lifecycle state

```javascript
const emptyWorkflow = new Workflow({ name: 'Empty' });
await emptyWorkflow.execute(); // Throws error or sets EMPTY
```

### FROZEN
- **Set:** After completion when freeze_on_completion is true
- **Meaning:** Workflow state is immutable
- **Final State:** Yes

```javascript
const workflow = new Workflow({
  steps: [step1, step2],
  freeze_on_completion: true
});

await workflow.execute();
console.log(workflow.state.get('status')); // 'frozen'

// Attempting to modify state will fail
```

## Complete Example

```javascript
import {
  Workflow,
  Step,
  StepTypes,
  WorkflowStatuses
} from 'micro-flow';

async function monitorWorkflowStatus() {
  const workflow = new Workflow({
    name: 'Status Demo',
    freeze_on_completion: true
  });
  
  console.log('Initial:', workflow.state.get('status')); // 'pending'
  
  workflow.pushSteps([
    new Step({
      name: 'Step 1',
      type: StepTypes.ACTION,
      callable: async () => {
        await new Promise(r => setTimeout(r, 1000));
        return { step: 1 };
      }
    }),
    new Step({
      name: 'Step 2',
      type: StepTypes.ACTION,
      callable: async () => {
        await new Promise(r => setTimeout(r, 1000));
        return { step: 2 };
      }
    })
  ]);
  
  // Track all status changes
  const statusHistory = [];
  
  workflow.events.on('WORKFLOW_STARTED', () => {
    statusHistory.push(workflow.state.get('status'));
  });
  
  workflow.events.on('WORKFLOW_COMPLETED', () => {
    statusHistory.push(workflow.state.get('status'));
  });
  
  await workflow.execute();
  
  console.log('Final:', workflow.state.get('status')); // 'frozen'
  console.log('History:', statusHistory); // ['running', 'frozen']
}
```

## Pause and Resume Example

```javascript
async function pauseResumeDemo() {
  const workflow = new Workflow({ name: 'Pause Demo' });
  
  workflow.pushSteps([
    new Step({
      name: 'Step 1',
      type: StepTypes.ACTION,
      callable: async () => console.log('Step 1')
    }),
    new Step({
      name: 'Step 2',
      type: StepTypes.ACTION,
      callable: async () => console.log('Step 2')
    }),
    new Step({
      name: 'Step 3',
      type: StepTypes.ACTION,
      callable: async () => console.log('Step 3')
    })
  ]);
  
  // Pause after current step
  setTimeout(() => workflow.pause(), 500);
  
  await workflow.execute();
  console.log('Status:', workflow.state.get('status')); // 'paused'
  
  // Resume later
  await new Promise(r => setTimeout(r, 2000));
  await workflow.resume();
  console.log('Status:', workflow.state.get('status')); // 'frozen' or 'completed'
}
```

## Status Transitions

| From | To | Trigger |
|------|-----|---------|
| PENDING | RUNNING | execute() called |
| PENDING | EMPTY | execute() called with no steps |
| RUNNING | COMPLETED | All steps finish successfully |
| RUNNING | FAILED | Step fails (exit_on_failure: true) |
| RUNNING | PAUSED | pause() called and step completes |
| COMPLETED | FROZEN | freeze_on_completion: true |
| PAUSED | RESUMED | resume() called |
| RESUMED | RUNNING | Execution resumes |

## See Also

- [Workflow Class](../classes/workflow.md)
- [step_statuses Enum](./step-statuses.md)
- [workflow_event_names Enum](./workflow-event-names.md)
- [Core Concepts - Workflows](../../core-concepts/workflows.md)
