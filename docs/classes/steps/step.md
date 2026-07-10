# Step

The fundamental unit of work in a logic flow. A `Step` wraps a callable (async function, another `Step`, or a `Workflow`) and adds timeout protection, automatic retries, status tracking, and shared state access via `Base`.

**Extends:** Base

## Table of Contents
- [Constructor](#constructor)
- [Properties](#properties)
- [Methods](#methods)
- [Examples](#examples)
- [Related](#related)

## Constructor

### `new Step(options)`

Creates a new Step instance.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `options.name` | `string` | `'step-<uuid>'` | Human-readable identifier used in logs and events. |
| `options.callable` | `Function\|Step\|Workflow` | `async () => {}` | The work to execute. Plain async functions are bound to the step instance, giving them access to `this.getState()` etc. |
| `options.callable_registry_key` | `string\|null` | `null` | Optional key to reference a callable in the workflow's `CallableRegistry` for persistence/hydration. |
| `options.max_retries` | `number` | `0` | Maximum number of additional attempts after a failure. |
| `options.max_timeout_ms` | `number` | `30000` | Milliseconds before execution times out and is treated as a failure. |
| `options.step_type` | `string` | `step_types.ACTION` | Semantic type from [`step_types`](../../../enums/step_types.md). |
| `options.sub_step_type` | `string\|null` | `null` | Sub-type from [`sub_step_types`](../../../enums/sub_step_types.md). |

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | UUID automatically assigned on construction. |
| `name` | `string` | Human-readable step name. |
| `base_type` | `string` | Always `'step'`. |
| `callable_type` | `string` | `'function'`, `'step'`, or `'workflow'`, set when the callable is assigned. |
| `callable_registry_key` | `string\|null` | Key referencing a callable in the workflow's `CallableRegistry` for persistence/hydration. |
| `max_retries` | `number` | Maximum number of retry attempts. |
| `retry_count` | `number` | Number of retries performed so far. |
| `max_timeout_ms` | `number` | Timeout threshold in milliseconds. |
| `step_type` | `string` | Semantic step type. |
| `sub_step_type` | `string\|null` | Semantic sub-type. |
| `errors` | `Error[]` | Array of errors caught during execution attempts. |
| `result` | `any` | Return value of the most recent successful execution. |
| `retry_results` | `Array<{retry_count: number, result: any}>` | Result of each retry attempt. |
| `status` | `string` | Current status (see [`step_statuses`](../../../enums/step_statuses.md)). |
| `timing` | `Object` | `{ start_time, complete_time, execution_time_ms, cancel_time }` from `Base`. |
| `parent_workflow_id` | `string\|null` | ID of the workflow this step belongs to (set by the workflow on add). |

## Methods

### `async execute()` → `Promise<Step|Workflow|Object>`

Races the callable against the timeout. On failure, retries up to `max_retries` times. If the callable is a `Step` or `Workflow`, returns that object directly (not the wrapper `Step`). Plain function callables return a serialized plain object (via `prepareForSerialization()`) with `result`, `errors`, and `timing` populated.

**Returns:** The inner Step/Workflow if callable is a step/workflow, or a serialized plain object for function callables.

**Throws:** The last caught error if all retry attempts are exhausted and the workflow has `exit_on_error` set.

**Example:**
```javascript
import { Step } from '@ronaldroe/micro-flow';

const step = new Step({
  name: 'compute-hash',
  callable: async () => {
    return 'sha256:abc123';
  },
});

const result = await step.execute();
console.log(result.result); // 'sha256:abc123'
console.log(result.status); // 'complete'
console.log(result.timing.execution_time_ms); // e.g. 2
```

---

### `getCallableType(callable)` → `'function'|'step'|'workflow'`

Inspects the callable and returns its type string.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `callable` | `Function\|Step\|Workflow` | The callable to inspect. |

**Returns:** `'function'`, `'step'`, or `'workflow'`.

**Throws:** `Error` if `callable` is not one of the accepted types.

---

### `prepareForSerialization()` → `Object`

Creates a plain object containing safely serializable properties of the step. For function callables with a `callable_registry_key`, the callable is stored as the registry key. For Step/Workflow callables, the callable is recursively serialized.

**Returns:** An object with `id`, `name`, `callable_type`, `step_type`, `sub_step_type`, `max_retries`, `max_timeout_ms`, `retry_count`, `retry_results`, `errors`, `result`, `timing`, `status`, and `parent_workflow_id`.

---

### `serialize()` → `string`

Serializes the step into a JSON string via `prepareForSerialization()`.

**Returns:** JSON string representation of the step.

---

### `toJSON()` → `Object`

Custom JSON serializer called by `JSON.stringify()`. Delegates to `prepareForSerialization()`.

**Returns:** Plain object representation of the step.

---

### `static hydrateSerialized(serialized_step)` → `Step`

Deserializes a JSON string into a `Step` instance.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `serialized_step` | `string` | JSON string representation of a step. |

**Returns:** A hydrated `Step` instance.

**Throws:** `Error` if `serialized_step` is not a string.

---

### `static hydrate(parsed_step)` → `Step`

Hydrates a parsed step object into a `Step` instance, resolving callables from the parent workflow's `CallableRegistry` if the callable is a registry reference string.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `parsed_step` | `Object` | A parsed step object (e.g., from `JSON.parse()`). |

**Returns:** A hydrated `Step` instance.

**Throws:** `Error` if a callable registry key is specified but not found in the registry.

---

### `setParentWorkflowValue(workflow_id, path, value)`

Sets a property on the parent workflow instance (retrieved from `State.workflows`). Used internally by `FlowControlStep` to set `should_break` or `should_skip`.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `workflow_id` | `string` | UUID of the workflow in `State.workflows`. |
| `path` | `string` | Property path on the workflow object. |
| `value` | `any` | Value to assign. |

**Throws:** `Error` if the workflow with `workflow_id` is not found in state.

---

### `set callable(callable)`

Setter that accepts a `Function`, `Step`, or `Workflow`:
- Detects and stores the type in `callable_type`.
- For plain functions: binds them to `this` so the callable has access to `this.getState()`, `this.setState()`, etc.
- For `Step`/`Workflow` callables: binds their `execute` method as the internal `_callable`.

**Example:**
```javascript
import { Step, Workflow } from '@ronaldroe/micro-flow';

// Step as callable — returns the inner step, not the wrapper
const innerStep = new Step({ name: 'inner', callable: async () => 42 });
const outer = new Step({ name: 'outer', callable: innerStep });

const result = await outer.execute();
console.log(result.result); // 42  (result is on the inner step)
console.log(result.name);   // 'inner'
```

## Examples

### With retries and timeout

```javascript
import { Step } from '@ronaldroe/micro-flow';

const fetchStep = new Step({
  name: 'fetch-user',
  max_retries: 3,
  max_timeout_ms: 5000,
  callable: async () => {
    const res = await fetch('https://api.example.com/users/1');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
});

const result = await fetchStep.execute();
if (result.errors.length > 0) {
  console.warn('Errors encountered:', result.errors.map(e => e.message));
}
console.log('User:', result.result);
```

### Using this.getState() inside callable

```javascript
import { Step, State } from '@ronaldroe/micro-flow';

State.set('config.multiplier', 3);

const step = new Step({
  name: 'multiply',
  callable: async function () {
    // 'this' is the Step instance
    const multiplier = this.getState('config.multiplier');
    const input = this.getState('pipeline.input') ?? 10;
    const output = input * multiplier;
    this.setState('pipeline.output', output);
    return output;
  },
});

await step.execute();
console.log(State.get('pipeline.output')); // 30
```

### Nested step as callable

```javascript
import { Step, Workflow } from '@ronaldroe/micro-flow';

const inner = new Step({
  name: 'inner-step',
  callable: async () => ({ processed: true }),
});

// When a Step is the callable, execute() returns the inner step directly
const outer = new Step({ name: 'outer-step', callable: inner });
const executed = await outer.execute();
console.log(executed.name);   // 'inner-step'
console.log(executed.result); // { processed: true }
```

### Nested workflow as callable

```javascript
import { Step, Workflow } from '@ronaldroe/micro-flow';

const subWorkflow = new Workflow({
  name: 'sub-flow',
  steps: [
    new Step({ name: 'a', callable: async () => 'a' }),
    new Step({ name: 'b', callable: async () => 'b' }),
  ],
});

const step = new Step({ name: 'run-sub-flow', callable: subWorkflow });
const result = await step.execute();
console.log(result.name);    // 'sub-flow'
console.log(result.results); // [{ message: '...', data: 'a' }, ...]
```

## Related

- [Workflow](../workflow.md) — Sequences steps and manages flow control.
- [LogicStep](logic_step.md) — Extends `Step` with conditional logic.
- [DelayStep](delay_step.md) — Extends `Step` with timed delays.
- [step_types](../../../enums/step_types.md) — Semantic type enum.
- [step_statuses](../../../enums/step_statuses.md) — Possible status values.
- [step_event_names](../../../enums/step_event_names.md) — Events emitted during execution.
