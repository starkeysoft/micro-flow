# workflow_statuses

Lifecycle status values for `Workflow` instances. The `status` property on a workflow is updated to one of these values as execution progresses.

## Table of Contents
- [Values](#values)
- [Usage](#usage)
- [Related](#related)

## Values

| Key | Value | Description |
|-----|-------|-------------|
| `CREATED` | `'created'` | Initial status set by the constructor. |
| `PENDING` | `'pending'` | Workflow is queued but not yet started. |
| `RUNNING` | `'running'` | `execute()` is actively processing steps. |
| `PAUSED` | `'paused'` | Execution was suspended via `pause()`. |
| `COMPLETE` | `'complete'` | All steps finished successfully. |
| `FAILED` | `'failed'` | A step failed and `exit_on_error` was `true`. |
| `ERRORED` | `'errored'` | An unexpected error occurred during execution. |
| `CANCELLED` | `'cancelled'` | The workflow was cancelled. |
| `SKIPPED` | `'skipped'` | The workflow was skipped. |
| `FROZEN` | `'frozen'` | The workflow's state has been frozen. |

## Usage

```javascript
import { Workflow, Step, workflow_statuses } from '@ronaldroe/micro-flow';

const wf = new Workflow({
  name: 'status-demo',
  steps: [
    new Step({ name: 'step-1', callable: async () => 'a' }),
    new Step({ name: 'step-2', callable: async () => 'b' }),
  ],
});

console.log(wf.status === workflow_statuses.CREATED); // true

await wf.execute();

console.log(wf.status === workflow_statuses.COMPLETE); // true
console.log(wf.status); // 'complete'
```

Checking for specific statuses:

```javascript
import { Workflow, Step, workflow_statuses } from '@ronaldroe/micro-flow';

const wf = new Workflow({
  name: 'error-check',
  exit_on_error: true,
  steps: [
    new Step({
      name: 'failing-step',
      callable: async () => { throw new Error('oops'); },
    }),
  ],
});

await wf.execute().catch(() => {});

if (wf.status === workflow_statuses.FAILED) {
  console.error('Workflow failed — check step errors');
}

// Pause/resume status check
const pausableWf = new Workflow({
  name: 'pausable',
  steps: [
    new Step({ name: 's1', callable: async () => { pausableWf.pause(); } }),
    new Step({ name: 's2', callable: async () => 'done' }),
  ],
});

await pausableWf.execute();
console.log(pausableWf.status === workflow_statuses.PAUSED); // true

await pausableWf.resume();
console.log(pausableWf.status === workflow_statuses.COMPLETE); // true
```

## Related

- [Workflow](../classes/workflow.md) — Has `status` property updated during execution.
- [workflow_event_names](workflow_event_names.md) — Events that correspond to status transitions.
