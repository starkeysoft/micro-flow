# Step Statuses

Enumeration of possible step execution statuses. Steps transition through these statuses during their lifecycle.

## Values

- `COMPLETE` - `'complete'` - Step has finished executing successfully
- `FAILED` - `'failed'` - Step execution failed
- `PENDING` - `'pending'` - Step is pending execution
- `QUEUED` - `'queued'` - Step is queued for execution
- `RUNNING` - `'running'` - Step is currently executing
- `WAITING` - `'waiting'` - Step is waiting for external condition

## Status Lifecycle

```
PENDING → QUEUED → RUNNING → COMPLETE
                           ↘ FAILED
                  ↘ WAITING
```

## Usage Examples

### Node.js - Status Monitoring

```javascript
import { Step, State, step_statuses } from 'micro-flow';

const step = new Step({
  name: 'monitored-step',
  callable: async () => {
    console.log('Processing...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return 'done';
  }
});

console.log('Initial status:', step.status);

await step.execute();

if (step.status === step_statuses.COMPLETE) {
  console.log('Step completed successfully');
} else if (step.status === step_statuses.FAILED) {
  console.error('Step failed');
}
```

### Browser with React - Status Display

```javascript
import { Step, step_statuses } from './micro-flow.js';
import { useState } from 'react';

function StepExecutor() {
  const [status, setStatus] = useState('');
  const [statusColor, setStatusColor] = useState('gray');

  const executeStep = async () => {
    const step = new Step({
      name: 'async-task',
      callable: async () => {
        setStatus(step_statuses.RUNNING);
        setStatusColor('blue');
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        return 'complete';
      }
    });

    await step.execute();

    if (step.status === step_statuses.COMPLETE) {
      setStatus(step_statuses.COMPLETE);
      setStatusColor('green');
    } else if (step.status === step_statuses.FAILED) {
      setStatus(step_statuses.FAILED);
      setStatusColor('red');
    }
  };

  return (
    <div>
      <button onClick={executeStep}>Execute Step</button>
      <p style={{ color: statusColor }}>
        Status: {status || 'Not started'}
      </p>
    </div>
  );
}
```

### Vue - Status Badge

```vue
<template>
  <div>
    <button @click="runStep">Run Step</button>
    <span :class="statusClass">{{ status }}</span>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Step, step_statuses } from './micro-flow.js';

const status = ref('');

const statusClass = computed(() => {
  switch (status.value) {
    case step_statuses.RUNNING: return 'badge-running';
    case step_statuses.COMPLETE: return 'badge-complete';
    case step_statuses.FAILED: return 'badge-failed';
    default: return 'badge-pending';
  }
});

const runStep = async () => {
  const step = new Step({
    name: 'test-step',
    callable: async () => {
      status.value = step_statuses.RUNNING;
      await new Promise(r => setTimeout(r, 1000));
    }
  });

  await step.execute();
  status.value = step.status;
};
</script>

<style scoped>
.badge-running { color: blue; }
.badge-complete { color: green; }
.badge-failed { color: red; }
.badge-pending { color: gray; }
</style>
```

### Node.js - Batch Status Check

```javascript
import { Workflow, Step, step_statuses } from 'micro-flow';

const workflow = new Workflow({
  name: 'batch-processor',
  steps: [
    new Step({ name: 'step-1', callable: async () => 'done' }),
    new Step({ name: 'step-2', callable: async () => 'done' }),
    new Step({ name: 'step-3', callable: async () => {
      throw new Error('Failed');
    }})
  ],
  exit_on_error: false
});

await workflow.execute();

const statusSummary = workflow.steps.reduce((acc, step) => {
  acc[step.status] = (acc[step.status] || 0) + 1;
  return acc;
}, {});

console.log('Status summary:', statusSummary);
// { complete: 2, failed: 1 }
```

## See Also

- [Workflow Statuses](workflow_statuses.md) - Workflow status enum
- [Step](../classes/steps/step.md) - Uses step statuses
- [Step Event Names](step_event_names.md) - Events for status changes
