# StepEvent

The event emitter for step lifecycle events. Pre-registers all `step_event_names` on construction. Accessed via `State.get('events.step')`.

**Extends:** [Event](event.md)

## Table of Contents
- [Constructor](#constructor)
- [Registered Events](#registered-events)
- [Examples](#examples)
- [Related](#related)

## Constructor

### `new StepEvent()`

Creates a new StepEvent instance and calls `registerEvents(step_event_names)`, pre-registering a sub-`Event` instance for every step event name.

The `StepEvent` instance is created automatically when the library initializes and stored at `State.get('events.step')`. You should not instantiate it directly.

## Registered Events

All events from [`step_event_names`](../../enums/step_event_names.md):

| Event Name | Value | Description |
|------------|-------|-------------|
| `STEP_PENDING` | `'step_pending'` | Emitted when a step is set to pending status. |
| `STEP_RUNNING` | `'step_running'` | Emitted when a step begins executing. |
| `STEP_COMPLETE` | `'step_complete'` | Emitted when a step finishes successfully. |
| `STEP_FAILED` | `'step_failed'` | Emitted when a step fails (all retries exhausted). |
| `STEP_RETRYING` | `'step_retrying'` | Emitted when the engine retries a failed step. |
| `STEP_WAITING` | `'step_waiting'` | Emitted when a step enters a waiting state (e.g., DelayStep). |
| `CONDITIONAL_TRUE_BRANCH_EXECUTED` | `'conditional_true_branch_executed'` | Emitted when a ConditionalStep takes the true branch. |
| `CONDITIONAL_FALSE_BRANCH_EXECUTED` | `'conditional_false_branch_executed'` | Emitted when a ConditionalStep takes the false branch. |
| `LOOP_ITERATION_COMPLETE` | `'loop_iteration_complete'` | Emitted after each LoopStep iteration. |
| `SWITCH_CASE_MATCHED` | `'switch_case_matched'` | Emitted when a SwitchStep case matches. |
| `DELAY_STEP_RELATIVE_SCHEDULED` | `'delay_step_relative_scheduled'` | Emitted when a relative delay is scheduled. |
| `DELAY_STEP_RELATIVE_COMPLETE` | `'delay_step_relative_complete'` | Emitted when a relative delay completes. |
| `DELAY_STEP_ABSOLUTE_SCHEDULED` | `'delay_step_absolute_scheduled'` | Emitted when an absolute delay is scheduled. |
| `DELAY_STEP_ABSOLUTE_COMPLETE` | `'delay_step_absolute_complete'` | Emitted when an absolute delay completes. |

## Examples

### Observability dashboard

```javascript
import { Workflow, Step, State } from '@ronaldroe/micro-flow';

const stepEvents = State.get('events.step');
const timings = {};

stepEvents.on('step_running', (data) => {
  timings[data.id] = Date.now();
  console.log(`▶ ${data.name}`);
});

stepEvents.on('step_complete', (data) => {
  const ms = data.timing.execution_time_ms;
  console.log(`✓ ${data.name} (${ms}ms)`);
});

stepEvents.on('step_failed', (data) => {
  console.error(`✗ ${data.name} failed:`, data.errors?.[0]?.message);
});

stepEvents.on('step_retrying', (data) => {
  console.warn(`↺ ${data.name} retrying (attempt ${data.retry_count})`);
});

const wf = new Workflow({
  name: 'observed-flow',
  steps: [
    new Step({ name: 'fetch',   callable: async () => ({ rows: 5 }) }),
    new Step({ name: 'process', callable: async () => ({ done: true }) }),
  ],
});

await wf.execute();
```

### Tracking retry attempts

```javascript
import { Step, State } from '@ronaldroe/micro-flow';

const stepEvents = State.get('events.step');

stepEvents.on('step_retrying', (data) => {
  console.warn(`Retry ${data.retry_count} of ${data.max_retries} for "${data.name}"`);
});

let attempts = 0;
const flaky = new Step({
  name: 'flaky-service',
  max_retries: 3,
  callable: async () => {
    attempts++;
    if (attempts < 3) throw new Error('Service unavailable');
    return { ok: true };
  },
});

await flaky.execute();
console.log('Succeeded after', attempts, 'attempts');
```

### Listening to conditional branch events

```javascript
import { ConditionalStep, State } from '@ronaldroe/micro-flow';

const stepEvents = State.get('events.step');

stepEvents.on('conditional_true_branch_executed', (data) => {
  console.log(`[${data.name}] Condition met — true branch`);
});

stepEvents.on('conditional_false_branch_executed', (data) => {
  console.log(`[${data.name}] Condition not met — false branch`);
});

const gate = new ConditionalStep({
  name: 'access-gate',
  conditional: { subject: 'admin', operator: '===', value: 'admin' },
  true_callable: async () => ({ access: 'granted' }),
  false_callable: async () => ({ access: 'denied' }),
});

await gate.execute();
```

### Using step_event_names enum

```javascript
import { Step, State, step_event_names } from '@ronaldroe/micro-flow';

const stepEvents = State.get('events.step');

stepEvents.on(step_event_names.STEP_COMPLETE, (data) => {
  console.log('Completed:', data.name, data.result);
});

const step = new Step({
  name: 'compute',
  callable: async () => 2 + 2,
});

await step.execute(); // logs: Completed: compute 4
```

## Related

- [Event](event.md) — Base class with `on`, `once`, `off`, `emit`, `onBroadcast`, `onAny`.
- [step_event_names](../../enums/step_event_names.md) — Full enum of registered event names.
- [Step](../steps/step.md) — Emits `STEP_RUNNING`, `STEP_COMPLETE`, `STEP_FAILED`, `STEP_RETRYING`.
- [ConditionalStep](../steps/conditional_step.md) — Emits branch events.
- [LoopStep](../steps/loop_step.md) — Emits `LOOP_ITERATION_COMPLETE`.
- [DelayStep](../steps/delay_step.md) — Emits delay-specific events.
- [SwitchStep](../steps/switch_step.md) — Emits `SWITCH_CASE_MATCHED`.
