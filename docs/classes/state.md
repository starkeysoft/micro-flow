# State

The global singleton that acts as the shared data store, event hub, and workflow registry for the entire library. `State` is a plain module-level object — it is never instantiated with `new`. All methods are called directly on the exported object.

`State` is automatically initialized with enums, event instances, and an empty workflow registry when the module loads. Any workflow, step, or application code can read and write to it using dot-notation or bracket-notation paths.

## Table of Contents
- [Default Structure](#default-structure)
- [Path Syntax](#path-syntax)
- [Methods](#methods)
- [Examples](#examples)
- [Related](#related)

## Default Structure

```javascript
{
  messages: { errors: {}, warnings: {} },
  statuses: {
    workflow: workflow_statuses,
    step: step_statuses,
  },
  event_names: {
    workflow: workflow_event_names,
    step: step_event_names,
    state: state_event_names,
  },
  events: {
    workflow: WorkflowEvent,  // instance of WorkflowEvent
    step: StepEvent,          // instance of StepEvent
    state: StateEvent,        // instance of StateEvent
  },
  types: {
    base_types,
    step_types,
    sub_step_types,
  },
  workflows: {},              // keyed by workflow UUID
  conditional_step_comparators,
}
```

## Path Syntax

All `get`, `set`, `delete`, and related methods accept a path string using:

- **Dot-notation:** `"user.profile.name"`
- **Bracket-notation (index):** `"users[0].name"`
- **Bracket-notation (quoted key):** `"data['key-name']"`

Both notations can be mixed: `"results[0].meta.tags[2]"`

Passing a falsy path (`null`, `undefined`, `''`) or `'*'` to `get` returns the entire state object.

## Methods

### `State.get(path, defaultValue?, type?)` → `any`

Retrieves a value from the state at the given path.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `path` | `string` | — | Dot/bracket path. Falsy or `'*'` returns entire state. |
| `defaultValue` | `any` | `null` | Returned if the path does not exist or resolves to `null`/`undefined`. |
| `type` | `string` | `null` | Optional coercion: `'string'`, `'number'`, or `'boolean'`. |

**Returns:** The value at the path, coerced if `type` is provided, or `defaultValue` if not found.

**Example:**
```javascript
import { State } from '@ronaldroe/micro-flow';

State.set('config.timeout', 5000);

const timeout = State.get('config.timeout');           // 5000
const missing = State.get('config.retries', 3);        // 3 (default)
const asStr   = State.get('config.timeout', null, 'string'); // '5000'
const whole   = State.get('*');                        // entire state object
```

---

### `State.set(path, value)`

Sets a value in the state at the given path, creating intermediate objects as needed.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `path` | `string` | Dot/bracket path to write. |
| `value` | `any` | The value to store. |

**Example:**
```javascript
import { State } from '@ronaldroe/micro-flow';

State.set('user.name', 'Alice');
State.set('user.scores[0]', 95);
State.set('user.scores[1]', 87);

console.log(State.get('user'));
// { name: 'Alice', scores: [95, 87] }
```

---

### `State.delete(path)`

Deletes the property at the given path.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `path` | `string` | Dot/bracket path to the property to remove. |

**Throws:** Error if the path is empty or invalid.

**Example:**
```javascript
import { State } from '@ronaldroe/micro-flow';

State.set('session.token', 'abc123');
State.delete('session.token');
console.log(State.get('session.token')); // null
```

---

### `State.merge(newState)` → `Object`

Performs a shallow merge of `newState` into the root state object. Existing keys not in `newState` are preserved.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `newState` | `Object` | Plain object whose top-level keys are merged into state. |

**Returns:** The updated state object.

**Example:**
```javascript
import { State } from '@ronaldroe/micro-flow';

State.merge({ featureFlags: { darkMode: true, beta: false } });
console.log(State.get('featureFlags.darkMode')); // true
```

---

### `State.each(path, callback)`

Asynchronously iterates over an array or object stored at `path`, calling `callback` for each item. Emits a `EACH` state event per item.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `path` | `string` | Path to an array or object in state. |
| `callback` | `Function` | Called with `(item, index)` for arrays or `(value, key)` for objects. |

**Example:**
```javascript
import { State } from '@ronaldroe/micro-flow';

State.set('queue', ['task-1', 'task-2', 'task-3']);

await State.each('queue', async (item, index) => {
  console.log(`Processing ${item} at index ${index}`);
});
```

---

### `State.freeze()`

Calls `Object.freeze()` on the state, making it immutable. Any subsequent `set` or `delete` calls will silently fail (in non-strict mode) or throw (in strict mode).

---

### `State.reset()`

Restores the state to the default structure. A fresh empty `workflows: {}` registry is created. Emits a `RESET` state event.

**Example:**
```javascript
import { State } from '@ronaldroe/micro-flow';

State.set('temp.data', [1, 2, 3]);
State.reset();
console.log(State.get('temp.data')); // null
```

---

### `State.getState()` → `Object`

Returns the entire state object directly (same as `State.get('*')`).

---

### `State.getFromPropertyPath(path, emit?)` → `any`

Low-level path resolver. Resolves the value at the given path and optionally emits a `GET_FROM_PROPERTY_PATH` event.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `path` | `string` | — | Dot/bracket path. |
| `emit` | `boolean` | `true` | Whether to emit the `GET_FROM_PROPERTY_PATH` state event. |

---

### `State.parsePath(path)` → `string[]`

Parses a dot/bracket-notation path string into an array of string keys.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `path` | `string` | Path string to parse. |

**Returns:** Array of key segments, e.g. `'users[0].name'` → `['users', '0', 'name']`.

**Example:**
```javascript
import { State } from '@ronaldroe/micro-flow';

console.log(State.parsePath('users[0].address.city'));
// ['users', '0', 'address', 'city']
```

---

### `State.setToPropertyPath(path, value, emit?)` → `void`

Low-level path setter. Sets the value at the given path and optionally emits a `SET_TO_PROPERTY_PATH` event.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `path` | `string` | — | Dot/bracket path. |
| `value` | `any` | — | Value to write. |
| `emit` | `boolean` | `true` | Whether to emit the `SET_TO_PROPERTY_PATH` state event. |

## Examples

### Passing data between steps via State

```javascript
import { Workflow, Step, State } from '@ronaldroe/micro-flow';

const wf = new Workflow({
  name: 'data-pipeline',
  steps: [
    new Step({
      name: 'fetch',
      callable: async function () {
        const data = [{ id: 1, value: 10 }, { id: 2, value: 20 }];
        this.setState('pipeline.raw', data);
        return data;
      },
    }),
    new Step({
      name: 'transform',
      callable: async function () {
        const raw = this.getState('pipeline.raw');
        const transformed = raw.map(r => ({ ...r, value: r.value * 2 }));
        this.setState('pipeline.transformed', transformed);
        return transformed;
      },
    }),
    new Step({
      name: 'summarize',
      callable: async function () {
        const data = this.getState('pipeline.transformed');
        const sum = data.reduce((acc, r) => acc + r.value, 0);
        this.setState('pipeline.sum', sum);
        return { sum };
      },
    }),
  ],
});

await wf.execute();
console.log('Sum:', State.get('pipeline.sum')); // 60
```

### Reacting to state changes

```javascript
import { State } from '@ronaldroe/micro-flow';

const stateEvents = State.get('events.state');

stateEvents.on('set', (data) => {
  console.log('State changed:', JSON.stringify(data));
});

State.set('user.status', 'active');
// logs: State changed: { path: 'user.status', value: 'active', state: { ... } }
```

### Type coercion

```javascript
import { State } from '@ronaldroe/micro-flow';

State.set('config.maxItems', '50');

const asNumber  = State.get('config.maxItems', null, 'number');  // 50
const asBoolean = State.get('config.maxItems', null, 'boolean'); // true
const asString  = State.get('config.maxItems', null, 'string');  // '50'
```

### Accessing enums from State

```javascript
import { State } from '@ronaldroe/micro-flow';

const workflowStatuses = State.get('statuses.workflow');
const stepEventNames   = State.get('event_names.step');
const workflowEvents   = State.get('events.workflow');

workflowEvents.on(workflowStatuses.COMPLETE, (data) => {
  console.log('Workflow complete:', data.name);
});
```

## Related

- [Base](base.md) — Exposes `this.getState()`, `this.setState()`, `this.deleteState()` as instance shortcuts.
- [StateEvent](events/state_event.md) — The event instance at `State.get('events.state')`.
- [state_event_names](../../enums/state_event_names.md) — All state event names.
