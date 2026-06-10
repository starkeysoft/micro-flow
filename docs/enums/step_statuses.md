# step_statuses

Lifecycle status values for `Step` instances. The `status` property on every step is updated to one of these values as execution progresses.

## Table of Contents
- [Values](#values)
- [Usage](#usage)
- [Related](#related)

## Values

| Key | Value | Description |
|-----|-------|-------------|
| `PENDING` | `'pending'` | Step has been created but not yet executed. |
| `QUEUED` | `'queued'` | Step is queued for execution (inside a workflow). |
| `RUNNING` | `'running'` | Step is currently executing. |
| `WAITING` | `'waiting'` | Step is in a waiting state (e.g., a `DelayStep` awaiting its timer). |
| `COMPLETE` | `'complete'` | Step completed successfully. |
| `FAILED` | `'failed'` | Step failed (all retry attempts exhausted). |

## Usage

```javascript
import { Step, step_statuses, State } from '@ronaldroe/micro-flow';

const step = new Step({
  name: 'compute',
  callable: async () => 42,
});

console.log(step.status); // 'pending' (before execute)

await step.execute();

console.log(step.status === step_statuses.COMPLETE); // true
console.log(step.status); // 'complete'
```

Checking status on all steps in a workflow:

```javascript
import { Workflow, Step, step_statuses } from '@ronaldroe/micro-flow';

const wf = new Workflow({
  name: 'batch',
  exit_on_error: false,
  steps: [
    new Step({ name: 'a', callable: async () => 'ok' }),
    new Step({ name: 'b', callable: async () => { throw new Error('fail'); } }),
    new Step({ name: 'c', callable: async () => 'ok' }),
  ],
});

await wf.execute();

for (const step of wf.steps) {
  if (step.status === step_statuses.FAILED) {
    console.warn(`Step "${step.name}" failed:`, step.errors[0]?.message);
  } else if (step.status === step_statuses.COMPLETE) {
    console.log(`Step "${step.name}" completed`);
  }
}
```

## Related

- [Step](../classes/steps/step.md) — Has a `status` property updated during execution.
- [step_event_names](step_event_names.md) — `STEP_RUNNING`, `STEP_COMPLETE`, `STEP_FAILED`, etc. correspond to these statuses.
