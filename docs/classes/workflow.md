# Workflow

The primary orchestration engine in micro-flow. A `Workflow` sequences an ordered list of steps, manages shared state, supports pause/resume, and aggregates per-step results. It is the top-level container for a logic flow.

**Extends:** [Base](../base.md)

## Table of Contents
- [Constructor](#constructor)
- [Properties](#properties)
- [Methods](#methods)
- [Events](#events)
- [Examples](#examples)
- [Related](#related)

## Constructor

### `new Workflow(options)`

Creates a new Workflow instance and registers it in the global `State.workflows` registry.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `options.name` | `string` | `'workflow-<uuid>'` | Human-readable identifier used in logs and events. |
| `options.exit_on_error` | `boolean` | `false` | When `true`, any step failure immediately halts execution and marks the workflow as failed. |
| `options.steps` | `Step[]` | `[]` | Initial array of steps to add to the workflow. |
| `options.throw_on_empty` | `boolean` | `false` | When `true`, calling `execute()` on a workflow with no steps throws an error. |

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | UUID automatically assigned on construction. |
| `name` | `string` | Human-readable workflow name. |
| `base_type` | `string` | Always `'workflow'`. |
| `status` | `string` | Current lifecycle status (see [`workflow_statuses`](../../enums/workflow_statuses.md)). Starts as `'created'`. |
| `results` | `Array<{message: string, data: any}>` | Ordered array of step results, one entry per executed step. |
| `_steps` | `Step[]` | Internal steps array. Access via the `steps` getter. |
| `steps_by_id` | `Object` | Map of `step.id → step` for fast lookup. |
| `current_step` | `string\|null` | ID of the currently executing step. |
| `should_break` | `boolean` | When set to `true` (by a `FlowControlStep`), halts the execution loop after the current step. |
| `should_skip` | `boolean` | When set to `true` (by a `FlowControlStep`), skips the next step in the sequence. |
| `should_pause` | `boolean` | When set to `true` (via `pause()`), suspends execution after the current step completes. |
| `should_continue` | `boolean` | Internal flag used during resume. |
| `exit_on_error` | `boolean` | Whether step failures halt the workflow. |
| `throw_on_empty` | `boolean` | Whether executing an empty workflow throws. |
| `timing` | `Object` | Timing data: `{ create_time, start_time, complete_time, pause_time, resume_time, execution_time_ms, cancel_time }`. |
| `sessions` | `Object` | Keyed record of past execution sessions (UUID → session data). |
| `current_session_id` | `string\|null` | UUID of the current execution session. |

## Methods

### `async execute()` → `Promise<Workflow>`

Runs all steps in sequence. Respects `should_break` (stops after current step), `should_skip` (skips next step), and `should_pause` (suspends after current step). Emits `WORKFLOW_RUNNING` at start and `WORKFLOW_COMPLETE` or `WORKFLOW_FAILED` at end.

**Returns:** The workflow instance with populated `results` and updated `timing`.

**Throws:** `Error` if `throw_on_empty` is `true` and the steps array is empty.

**Example:**
```javascript
import { Workflow, Step } from '@ronaldroe/micro-flow';

const workflow = new Workflow({
  name: 'send-report',
  exit_on_error: true,
  steps: [
    new Step({ name: 'fetch-data', callable: async () => ({ rows: 42 }) }),
    new Step({ name: 'render-pdf', callable: async () => 'report.pdf' }),
    new Step({ name: 'send-email', callable: async () => ({ sent: true }) }),
  ],
});

const result = await workflow.execute();
console.log(result.status);                   // 'complete'
console.log(result.timing.execution_time_ms); // e.g. 320
console.log(result.results[0]);               // { message: '...', data: { rows: 42 } }
```

---

### `async resume()` → `Promise<Workflow>`

Resumes a paused workflow from the step after the one that was executing when `pause()` was called. Emits `WORKFLOW_RESUMED`.

**Returns:** The workflow instance.

**Throws:** Does nothing if the workflow is not in a paused state.

**Example:**
```javascript
import { Workflow, Step } from '@ronaldroe/micro-flow';

const wf = new Workflow({
  name: 'pausable-flow',
  steps: [
    new Step({ name: 'step-1', callable: async () => 'a' }),
    new Step({ name: 'step-2', callable: async () => 'b' }),
    new Step({ name: 'step-3', callable: async () => 'c' }),
  ],
});

// Pause after first step executes
wf.steps[0] = new Step({
  name: 'step-1',
  callable: async () => { wf.pause(); return 'a'; },
});

await wf.execute();     // pauses mid-flow
await wf.resume();      // continues from step-2
```

---

### `async step()` → `Promise<*>`

Executes only the current single step (identified by `current_step`). Useful for manually stepping through a workflow one unit at a time.

**Returns:** The result of the executed step.

---

### `addStep(step)`

Appends a step to the end of the steps array. Emits `WORKFLOW_STEP_ADDED`.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `step` | `Step` | A valid `Step` instance (or subclass). |

**Throws:** `Error` if `step` is not a valid Step instance.

---

### `addStepAtIndex(step, index)`

Inserts a step at the specified zero-based index, shifting subsequent steps. Emits `WORKFLOW_STEP_ADDED`.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `step` | `Step` | A valid `Step` instance (or subclass). |
| `index` | `number` | Zero-based position at which to insert. |

---

### `addSteps(steps)`

Appends multiple steps at once. Emits `WORKFLOW_STEPS_ADDED`.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `steps` | `Step[]` | Array of valid Step instances. |

---

### `clearSteps()`

Empties the steps array. Emits `WORKFLOW_STEPS_CLEARED`.

---

### `deleteStep(stepId)`

Removes the step with the given ID. Emits `WORKFLOW_STEP_REMOVED`.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `stepId` | `string` | The `id` of the step to remove. |

---

### `deleteStepByIndex(index)`

Removes the step at the given zero-based index. Emits `WORKFLOW_STEP_REMOVED`.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `index` | `number` | Zero-based position of the step to remove. |

---

### `isEmpty()` → `boolean`

Returns `true` if the workflow has no steps.

---

### `markAsCreated()`

Sets status to `'created'` and emits `WORKFLOW_CREATED`.

---

### `markAsPaused()`

Sets status to `'paused'` and emits `WORKFLOW_PAUSED`.

---

### `markAsResumed()`

Sets status to `'running'` and emits `WORKFLOW_RESUMED`.

---

### `moveStep(fromIndex, toIndex)`

Reorders a step by moving it from one index to another. Emits `WORKFLOW_STEP_MOVED`.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `fromIndex` | `number` | Current zero-based index of the step. |
| `toIndex` | `number` | Target zero-based index. |

---

### `pause()`

Sets `should_pause = true`. The workflow will suspend execution after the currently running step completes.

---

### `popStep()` → `Step`

Removes and returns the last step in the array. Emits `WORKFLOW_STEP_REMOVED`.

---

### `pushStep(step)`

Alias for `addStep(step)`.

---

### `pushSteps(steps)`

Alias for `addSteps(steps)`.

---

### `shiftStep()` → `Step`

Removes and returns the first step in the array. Emits `WORKFLOW_STEP_SHIFTED`.

---

### `unshiftStep(step)`

Prepends a step to the beginning of the steps array. Emits `WORKFLOW_STEP_ADDED`.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `step` | `Step` | A valid `Step` instance (or subclass). |

---

### `prepareResult(message, data)`

Pushes `{ message, data }` onto the `results` array. Called internally after each step completes.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `message` | `string` | Descriptive message for the result entry. |
| `data` | `any` | The step's return value. |

---

### `get steps` / `set steps`

The `steps` getter returns the internal `_steps` array. The `set steps` setter validates each element and adds them via `addSteps()`.

## Events

All events are emitted on `State.get('events.workflow')`. See [`workflow_event_names`](../../enums/workflow_event_names.md) for the full list.

| Event | When |
|-------|------|
| `WORKFLOW_CREATED` | After constructor completes. |
| `WORKFLOW_RUNNING` | When `execute()` begins. |
| `WORKFLOW_COMPLETE` | When all steps finish successfully. |
| `WORKFLOW_FAILED` | When `exit_on_error` is true and a step fails. |
| `WORKFLOW_PAUSED` | When execution is suspended via `pause()`. |
| `WORKFLOW_RESUMED` | When `resume()` is called. |
| `WORKFLOW_BREAK_EXECUTED` | When a `FlowControlStep` triggers a break. |
| `WORKFLOW_STEP_SKIPPED` | When a step is skipped due to `should_skip`. |
| `WORKFLOW_STEP_ADDED` | When `addStep()` / `addStepAtIndex()` is called. |
| `WORKFLOW_STEPS_ADDED` | When `addSteps()` is called. |
| `WORKFLOW_STEP_REMOVED` | When a step is deleted or popped. |
| `WORKFLOW_STEP_MOVED` | When `moveStep()` is called. |
| `WORKFLOW_STEPS_CLEARED` | When `clearSteps()` is called. |

## Examples

### Basic sequential logic flow

```javascript
import { Workflow, Step, State } from '@ronaldroe/micro-flow';

const workflow = new Workflow({
  name: 'user-onboarding',
  exit_on_error: true,
  steps: [
    new Step({
      name: 'create-account',
      callable: async () => {
        const user = { id: 1, email: 'alice@example.com' };
        State.set('onboarding.user', user);
        return user;
      },
    }),
    new Step({
      name: 'send-welcome-email',
      max_retries: 2,
      callable: async function () {
        const user = this.getState('onboarding.user');
        console.log(`Sending welcome email to ${user.email}`);
        return { sent: true };
      },
    }),
    new Step({
      name: 'create-profile',
      callable: async function () {
        const user = this.getState('onboarding.user');
        return { userId: user.id, profileCreated: true };
      },
    }),
  ],
});

const result = await workflow.execute();
console.log('Status:', result.status);                     // 'complete'
console.log('Steps run:', result.results.length);          // 3
console.log('Total time:', result.timing.execution_time_ms + 'ms');
```

### Pause and resume

```javascript
import { Workflow, Step, State } from '@ronaldroe/micro-flow';

const wf = new Workflow({ name: 'pausable' });

wf.addStep(new Step({
  name: 'step-a',
  callable: async function () {
    this.setState('progress', 'a');
    return 'step-a done';
  },
}));

wf.addStep(new Step({
  name: 'pause-here',
  callable: async () => {
    wf.pause();
    return 'pausing';
  },
}));

wf.addStep(new Step({
  name: 'step-b',
  callable: async function () {
    this.setState('progress', 'b');
    return 'step-b done';
  },
}));

await wf.execute();
console.log('Status after first run:', wf.status); // 'paused'
console.log('Progress:', State.get('progress'));    // 'a'

// Later, after some external signal:
await wf.resume();
console.log('Status after resume:', wf.status);    // 'complete'
console.log('Progress:', State.get('progress'));    // 'b'
```

### Listening for workflow events

```javascript
import { Workflow, Step, State } from '@ronaldroe/micro-flow';

const events = State.get('events.workflow');

events.on('workflow_complete', (data) => {
  console.log(`"${data.name}" finished in ${data.timing.execution_time_ms}ms`);
});

events.on('workflow_failed', (data) => {
  console.error(`"${data.name}" failed`);
});

const wf = new Workflow({
  name: 'monitored-flow',
  steps: [
    new Step({ name: 'task', callable: async () => ({ ok: true }) }),
  ],
});

await wf.execute();
```

### Dynamic step manipulation

```javascript
import { Workflow, Step } from '@ronaldroe/micro-flow';

const wf = new Workflow({ name: 'dynamic' });

const stepA = new Step({ name: 'a', callable: async () => 'A' });
const stepB = new Step({ name: 'b', callable: async () => 'B' });
const stepC = new Step({ name: 'c', callable: async () => 'C' });

wf.addSteps([stepA, stepB, stepC]);

// Insert a new step between A and B
wf.addStepAtIndex(new Step({ name: 'a-b', callable: async () => 'A-B' }), 1);

// Move step C to position 0
wf.moveStep(3, 0);

// Remove step B by ID
wf.deleteStep(stepB.id);

console.log(wf.steps.map(s => s.name)); // ['c', 'a', 'a-b']

await wf.execute();
```

## Related

- [Step](steps/step.md) — The unit of work added to a workflow.
- [FlowControlStep](steps/flow_control_step.md) — Modifies `should_break` / `should_skip` at runtime.
- [State](state.md) — Global singleton holding the workflow registry.
- [workflow_event_names](../../enums/workflow_event_names.md) — All events emitted by `Workflow`.
- [workflow_statuses](../../enums/workflow_statuses.md) — Possible status values.
