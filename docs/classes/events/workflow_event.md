# WorkflowEvent

The event emitter for workflow lifecycle events. Pre-registers all `workflow_event_names` on construction. Accessed via `State.get('events.workflow')`.

**Extends:** [Event](event.md)

## Table of Contents
- [Constructor](#constructor)
- [Registered Events](#registered-events)
- [Examples](#examples)
- [Related](#related)

## Constructor

### `new WorkflowEvent()`

Creates a new WorkflowEvent instance and calls `registerEvents(workflow_event_names)`, pre-registering a sub-`Event` instance for every workflow event name.

The `WorkflowEvent` instance is created automatically when the library initializes and stored at `State.get('events.workflow')`. You should not instantiate it directly.

## Registered Events

All events from [`workflow_event_names`](../../enums/workflow_event_names.md):

| Event Name | Value | Description |
|------------|-------|-------------|
| `WORKFLOW_CREATED` | `'workflow_created'` | Emitted after a Workflow constructor completes. |
| `WORKFLOW_RUNNING` | `'workflow_running'` | Emitted when `execute()` begins. |
| `WORKFLOW_COMPLETE` | `'workflow_complete'` | Emitted when all steps finish successfully. |
| `WORKFLOW_FAILED` | `'workflow_failed'` | Emitted when `exit_on_error` is true and a step fails. |
| `WORKFLOW_ERRORED` | `'workflow_errored'` | Emitted on an unexpected execution error. |
| `WORKFLOW_CANCELLED` | `'workflow_cancelled'` | Emitted when a workflow is cancelled. |
| `WORKFLOW_PAUSED` | `'workflow_paused'` | Emitted when `pause()` suspends execution. |
| `WORKFLOW_RESUMED` | `'workflow_resumed'` | Emitted when `resume()` continues execution. |
| `WORKFLOW_BREAK_EXECUTED` | `'workflow_break_executed'` | Emitted when a FlowControlStep triggers a break. |
| `WORKFLOW_STEP_SKIPPED` | `'workflow_step_skipped'` | Emitted when a step is skipped due to `should_skip`. |
| `WORKFLOW_STEP_ADDED` | `'workflow_step_added'` | Emitted when a step is added to the workflow. |
| `WORKFLOW_STEPS_ADDED` | `'workflow_steps_added'` | Emitted when multiple steps are added. |
| `WORKFLOW_STEP_REMOVED` | `'workflow_step_removed'` | Emitted when a step is removed or popped. |
| `WORKFLOW_STEP_MOVED` | `'workflow_step_moved'` | Emitted when a step is reordered. |
| `WORKFLOW_STEP_SHIFTED` | `'workflow_step_shifted'` | Emitted when the first step is shifted off. |
| `WORKFLOW_STEPS_CLEARED` | `'workflow_steps_cleared'` | Emitted when all steps are cleared. |

## Examples

### Monitoring workflow lifecycle

```javascript
import { Workflow, Step, State } from '@ronaldroe/micro-flow';

const wfEvents = State.get('events.workflow');

wfEvents.on('workflow_running', (data) => {
  console.log(`[${new Date().toISOString()}] Starting: "${data.name}"`);
});

wfEvents.on('workflow_complete', (data) => {
  console.log(`[${new Date().toISOString()}] Complete: "${data.name}" (${data.timing.execution_time_ms}ms)`);
});

wfEvents.on('workflow_failed', (data) => {
  console.error(`[${new Date().toISOString()}] Failed: "${data.name}"`);
});

const wf = new Workflow({
  name: 'monitored-flow',
  steps: [
    new Step({ name: 'task-a', callable: async () => ({ result: 'a' }) }),
    new Step({ name: 'task-b', callable: async () => ({ result: 'b' }) }),
  ],
});

await wf.execute();
```

### Logging step mutations

```javascript
import { Workflow, Step, State } from '@ronaldroe/micro-flow';

const wfEvents = State.get('events.workflow');

wfEvents.on('workflow_step_added', (data) => {
  console.log(`Step added to "${data.name}": ${data.step?.name}`);
});

wfEvents.on('workflow_step_moved', (data) => {
  console.log(`Step moved in "${data.name}"`);
});

const wf = new Workflow({ name: 'dynamic-flow' });
wf.addStep(new Step({ name: 'first', callable: async () => 1 }));
wf.addStep(new Step({ name: 'second', callable: async () => 2 }));
wf.moveStep(1, 0);
```

### Using workflow_event_names enum

```javascript
import { Workflow, Step, State, workflow_event_names } from '@ronaldroe/micro-flow';

const wfEvents = State.get('events.workflow');

wfEvents.on(workflow_event_names.WORKFLOW_COMPLETE, (data) => {
  console.log('Complete:', data.name);
});

wfEvents.on(workflow_event_names.WORKFLOW_PAUSED, (data) => {
  console.log('Paused:', data.name);
});

const wf = new Workflow({
  name: 'enum-demo',
  steps: [new Step({ name: 's1', callable: async () => 'done' })],
});

await wf.execute();
```

### Cross-tab workflow monitoring (browser)

```javascript
import { State } from '@ronaldroe/micro-flow';

const wfEvents = State.get('events.workflow');

// Receive workflow completions from any browser tab
const { broadcast } = wfEvents.onAny('workflow_complete', (data) => {
  console.log(`Workflow "${data.name}" completed (from any tab)`);
  document.getElementById('last-run').textContent = data.name;
});

window.addEventListener('beforeunload', () => broadcast.destroy());
```

## Related

- [Event](event.md) — Base class with `on`, `once`, `off`, `emit`, `onBroadcast`, `onAny`.
- [workflow_event_names](../../enums/workflow_event_names.md) — Full enum of registered event names.
- [Workflow](../workflow.md) — Emits these events during its lifecycle.
- [State](../state.md) — Holds this instance at `events.workflow`.
