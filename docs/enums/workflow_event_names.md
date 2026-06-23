# workflow_event_names

Event names emitted during the lifecycle of a `Workflow`. All events are available on the `WorkflowEvent` instance at `State.get('events.workflow')`.

## Table of Contents
- [Values](#values)
- [Usage](#usage)
- [Related](#related)

## Values

| Key | Value | Description |
|-----|-------|-------------|
| `WORKFLOW_CREATED` | `'workflow_created'` | Emitted after a `Workflow` constructor completes. |
| `WORKFLOW_RUNNING` | `'workflow_running'` | Emitted when `execute()` begins. |
| `WORKFLOW_COMPLETE` | `'workflow_complete'` | Emitted when all steps finish successfully. |
| `WORKFLOW_FAILED` | `'workflow_failed'` | Emitted when `exit_on_error` is `true` and a step fails. |
| `WORKFLOW_ERRORED` | `'workflow_errored'` | Emitted on an unexpected execution error. |
| `WORKFLOW_CANCELLED` | `'workflow_cancelled'` | Emitted when a workflow is cancelled. |
| `WORKFLOW_PAUSED` | `'workflow_paused'` | Emitted when `pause()` suspends execution. |
| `WORKFLOW_RESUMED` | `'workflow_resumed'` | Emitted when `resume()` continues execution. |
| `WORKFLOW_BREAK_EXECUTED` | `'workflow_break_executed'` | Emitted when a `FlowControlStep` triggers a break. |
| `WORKFLOW_STEP_SKIPPED` | `'workflow_step_skipped'` | Emitted when a step is skipped due to `should_skip`. |
| `WORKFLOW_STEP_ADDED` | `'workflow_step_added'` | Emitted when a step is added to the workflow. |
| `WORKFLOW_STEPS_ADDED` | `'workflow_steps_added'` | Emitted when multiple steps are added at once. |
| `WORKFLOW_STEP_REMOVED` | `'workflow_step_removed'` | Emitted when a step is removed or popped. |
| `WORKFLOW_STEP_MOVED` | `'workflow_step_moved'` | Emitted when `moveStep()` reorders a step. |
| `WORKFLOW_STEP_SHIFTED` | `'workflow_step_shifted'` | Emitted when `shiftStep()` removes the first step. |
| `WORKFLOW_STEPS_CLEARED` | `'workflow_steps_cleared'` | Emitted when `clearSteps()` empties the steps array. |

## Usage

```javascript
import { Workflow, Step, State, workflow_event_names } from '@ronaldroe/micro-flow';

const wfEvents = State.get('events.workflow');

// Using enum constants
wfEvents.on(workflow_event_names.WORKFLOW_RUNNING, (data) => {
  console.log(`Starting workflow: "${data.name}"`);
});

wfEvents.on(workflow_event_names.WORKFLOW_COMPLETE, (data) => {
  console.log(`Workflow "${data.name}" finished in ${data.timing.execution_time_ms}ms`);
});

wfEvents.on(workflow_event_names.WORKFLOW_FAILED, (data) => {
  console.error(`Workflow "${data.name}" failed`);
});

wfEvents.on(workflow_event_names.WORKFLOW_PAUSED, (data) => {
  console.log(`Workflow "${data.name}" paused`);
});

wfEvents.on(workflow_event_names.WORKFLOW_STEP_ADDED, (data) => {
  console.log(`Step added to "${data.name}"`);
});

const wf = new Workflow({
  name: 'demo',
  steps: [new Step({ name: 'task', callable: async () => 'done' })],
});

await wf.execute();
```

Using raw string values is also valid:

```javascript
import { State } from '@ronaldroe/micro-flow';

State.get('events.workflow').on('workflow_complete', (data) => {
  console.log('Done:', data.name);
});
```

## Related

- [WorkflowEvent](../classes/events/workflow_event.md) — Registers and emits these events.
- [Workflow](../classes/workflow.md) — The source of all workflow events.
- [State](../classes/state.md) — Holds the `WorkflowEvent` instance at `events.workflow`.
