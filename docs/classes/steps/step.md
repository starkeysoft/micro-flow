# Step

The fundamental unit of work in a logic flow. A `Step` wraps a callable (async function, another `Step`, or a `Workflow`) and adds timeout protection, automatic retries, status tracking, and shared state access via `Base`.

**Extends:** Base

## Table of Contents
- [Constructor](#constructor)
- [Properties](#properties)
- [Methods](#methods)
- [Examples](#examples)
- [Persistence](#persistence)
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
| `static step_name` | `string` | `'step'` on the base class; each subclass overrides it with its own name (e.g. `'conditional'`, `'loop'`). Stored as `class_name` on serialization so hydration can rebuild the correct subclass. See [Persistence](#persistence). |

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

Creates a plain object containing safely serializable properties of the step. The `callable` field is stored as a `{ type, value }` descriptor: for function callables with a `callable_registry_key`, `value` is that key; for other function callables, `value` is `callable.name`; for `Step`/`Workflow` callables, `value` is the callable's own `prepareForSerialization()` output (recursive). Subclasses override this to add their own fields — see [Persistence](#persistence) and each subclass's docs.

**Returns:** An object with `id`, `class_name`, `name`, `callable_type`, `callable`, `step_type`, `sub_step_type`, `max_retries`, `max_timeout_ms`, `retry_count`, `retry_results`, `errors`, `result`, `timing`, `status`, and `parent_workflow_id`:

```
{
  id: string,
  class_name: string,       // static step_name of the concrete subclass, e.g. 'conditional'
  name: string,
  callable_type: 'function' | 'step' | 'workflow',
  callable: { type: 'function', value: string } | { type: 'step' | 'workflow', value: {...} } | null,
  step_type: string,
  sub_step_type: string | null,
  max_retries: number,
  max_timeout_ms: number,
  retry_count: number,
  retry_results: [{ retry_count: number, result: any }, ...],
  errors: [Error, ...],
  result: any,
  timing: { start_time, complete_time, execution_time_ms, cancel_time },
  status: string,
  parent_workflow_id: string | null
}
```

Subclasses extend or override some of these keys — see each subclass's own `prepareForSerialization()` entry.

---

### `serialize()` → `string`

Serializes the step into a JSON string via `prepareForSerialization()`.

**Returns:** JSON string representation of the step.

---

### `toJSON()` → `Object`

Custom JSON serializer called by `JSON.stringify()`. Delegates to `prepareForSerialization()`.

**Returns:** Plain object representation of the step.

---

### `static getCallableType(callable)` → `'function'|'step'|'workflow'`

Static version of `getCallableType()` (the instance method delegates to this). Useful when you need to classify a callable without a `Step` instance on hand.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `callable` | `Function\|Step\|Workflow` | The callable to inspect. |

**Returns:** `'function'`, `'step'`, or `'workflow'`.

**Throws:** `Error` if `callable` is not one of the accepted types.

---

### `static registerStepClass(StepClass)`

Registers a `Step` subclass, keyed by its static `step_name`, so that `hydrateAny()`/`hydrateSerialized()` can rebuild an instance of the correct class instead of a plain `Step`. Every built-in subclass calls this on itself at the bottom of its own file as a side effect of being imported (e.g. `ConditionalStep.registerStepClass(ConditionalStep)`), so registration happens automatically as long as the class has been imported somewhere — which it will be, if you're importing from the package's main entry point.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `StepClass` | `typeof Step` | The `Step` subclass to register. |

**Note:** A custom `Step` subclass you define yourself must call `YourStep.registerStepClass(YourStep)` for its own instances to hydrate back into `YourStep` rather than a plain `Step`.

---

### `static resolveStepClass(step_name)` → `typeof Step`

Looks up the class registered under `step_name` (see `registerStepClass`). Falls back to the base `Step` class if nothing is registered under that name.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `step_name` | `string` | A `step_name` value, as stored in `class_name` on a serialized step. |

**Returns:** The resolved `Step` subclass (constructor function, not an instance).

---

### `static serializeCallableField(callable)` → `Object|null`

Serializes a single callable-like value (a function, `Step`, or `Workflow`) into the same `{ type, value }` descriptor shape used for the step's own `callable` field. Subclasses with additional callable-like properties (e.g. `ConditionalStep.true_callable`) use this to serialize them consistently.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `callable` | `Function\|Step\|Workflow\|null` | The callable to serialize. |

**Returns:** A `{ type, value }` descriptor, or `null` if `callable` is `null`/`undefined`.

---

### `static hydrateCallableField(serialized, callableRegistry?)` → `Function|Step|Workflow|undefined`

Hydrates a `{ type, value }` descriptor (as produced by `serializeCallableField`) back into a live function, `Step`, or `Workflow`. A function is resolved from `callableRegistry` by name; a `Step`/`Workflow` descriptor is hydrated recursively via `hydrateAny()` / `Workflow.hydrate()`. Idempotent — passing an already-hydrated value through returns it unchanged, so a subclass `hydrate()` override can resolve a field and safely delegate to `super.hydrate()`.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `serialized` | `Object\|Function\|Step\|Workflow\|null` | The descriptor to hydrate, or an already-hydrated value. |
| `callableRegistry` | `CallableRegistry\|null` | Registry used to resolve a function-type descriptor by name. |

**Returns:** The hydrated callable, or `undefined` if `serialized` was `null`/`undefined`.

**Throws:** `Error` if a function descriptor's name isn't found in `callableRegistry` (or none was provided), or if the descriptor's `type` is unrecognized.

---

### `static hydrateAny(parsed_step, callableRegistry?)` → `Step`

The main entry point for hydrating a step of **unknown subclass** — used internally by `Workflow.hydrate()` and by any subclass whose own fields nest other steps (e.g. `SwitchStep.cases`). Resolves the correct class from `parsed_step.class_name` via `resolveStepClass()`, then delegates to that class's own `static hydrate()`.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `parsed_step` | `Object` | A parsed step object (e.g., from `JSON.parse()`). |
| `callableRegistry` | `CallableRegistry\|null` | Registry used to resolve function callables. |

**Returns:** A hydrated instance of the step's original subclass.

---

### `static hydrateSerialized(serialized_step, callableRegistry?)` → `Step`

Deserializes a JSON string and hydrates it via `hydrateAny()`, dispatching to the correct `Step` subclass regardless of which class this is called on.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `serialized_step` | `string` | JSON string representation of a step. |
| `callableRegistry` | `CallableRegistry\|null` | Optional. Registry used to resolve function callables. Required if the step's `callable` (or a subclass-specific callable field) is a plain function. |

**Returns:** A hydrated `Step` (or subclass) instance.

**Throws:** `Error` if `serialized_step` is not a string.

---

### `static hydrate(parsed_step, callableRegistry?)` → `Step`

Hydrates a parsed step object into an instance of **`this`** class — so `ConditionalStep.hydrate(x)` builds a `ConditionalStep`, while `Step.hydrate(x)` builds a plain `Step`. Resolves the step's primary `callable` (from a registry key, function name, or nested `Step`/`Workflow`) and restores execution metadata (`id`, `retry_count`, `retry_results`, `errors`, `result`, `timing`, `status`, `parent_workflow_id`). Subclasses with extra callable-like fields (e.g. `ConditionalStep.true_callable`/`false_callable`) override this to resolve those fields with `hydrateCallableField()` before delegating to `super.hydrate()`.

Prefer `hydrateAny()` / `hydrateSerialized()` unless you already know the concrete subclass — calling `hydrate()` directly on the wrong class will silently build the wrong type.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `parsed_step` | `Object` | A parsed step object (e.g., from `JSON.parse()`). |
| `callableRegistry` | `CallableRegistry\|null` | Optional. Registry used to resolve function callables. |

**Returns:** A hydrated instance of `this` class.

**Throws:** `Error` if a function callable's registry key isn't found in `callableRegistry` (or none was provided).

---

### `setParentWorkflowValue(workflow_id, path, value)`

Sets a property on the parent workflow instance (retrieved from this step's own state's `workflows` registry — see [State: Deprecation](../state.md#deprecation-continuing-to-use-state) if `use_state_singleton` is `true`, in which case it's retrieved from the deprecated `State.workflows` singleton instead). Used internally by `FlowControlStep` to set `should_break` or `should_skip`.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `workflow_id` | `string` | UUID of the workflow, as registered in this step's `workflows` state. |
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

## Persistence

Any `Step` can be saved and reconstructed via `serialize()` → `Step.hydrateSerialized()`. Because a step can hold nested `Step`/`Workflow` callables of any subclass, hydration always needs to know which concrete class to rebuild — that's what `class_name` (from `static step_name`) and the `Step.registerStepClass()`/`resolveStepClass()` registry are for. **Always hydrate through `Step.hydrateSerialized()` or `Step.hydrateAny()`**, not a subclass's own `static hydrate()` directly, unless you already know the concrete type — calling `hydrate()` on the wrong class silently builds the wrong one.

**Function callables need a `CallableRegistry`.** A plain function can't be serialized. If `callable` is a function, pass a `callable_registry_key` matching a name registered in a [`CallableRegistry`](../callable_registry.md) so it can be looked up again on hydration:

```javascript
import { Step, CallableRegistry } from '@ronaldroe/micro-flow';

const registry = new CallableRegistry();
registry.register('sendWelcomeEmail', async function sendWelcomeEmail() {
  return { sent: true };
});

const step = new Step({
  name: 'welcome-email',
  callable: registry.get('sendWelcomeEmail'),
  callable_registry_key: 'sendWelcomeEmail',
});

const saved = step.serialize();

// Elsewhere (or later, after re-registering the same function under the same name):
const hydrated = Step.hydrateSerialized(saved, registry);
await hydrated.execute();
```

A `Step`/`Workflow` used as `callable` needs no registry — it's serialized and rehydrated recursively as its own object graph, with its own `class_name`:

```javascript
import { Step } from '@ronaldroe/micro-flow';

const inner = new Step({ name: 'inner', callable: async () => 42 }); // needs a registry itself if this stays a plain function
const outer = new Step({ name: 'outer', callable: inner });

const hydrated = Step.hydrateSerialized(outer.serialize());
console.log(hydrated.constructor.name); // 'Step' (the inner one, per execute()'s semantics)
```

See [`CallableRegistry`](../callable_registry.md) for the registry API and the naming convention it depends on, and each subclass's own docs (e.g. [ConditionalStep § Persistence](conditional_step.md), [LoopStep § Persistence](loop_step.md)) for the extra fields they persist.

## Related

- [Workflow](../workflow.md) — Sequences steps and manages flow control.
- [LogicStep](logic_step.md) — Extends `Step` with conditional logic.
- [DelayStep](delay_step.md) — Extends `Step` with timed delays.
- [CallableRegistry](../callable_registry.md) — Resolves function callables by name during hydration.
- [step_types](../../../enums/step_types.md) — Semantic type enum.
- [step_statuses](../../../enums/step_statuses.md) — Possible status values.
- [step_event_names](../../../enums/step_event_names.md) — Events emitted during execution.
