# Event

The base event class for the micro-flow event system. `Event` extends the native `EventTarget` with an EventEmitter-style API (`on`, `once`, `off`, `emit`) and adds cross-context broadcasting via the `BroadcastChannel` API, enabling events to propagate across browser tabs, workers, and other execution contexts.

All three event instances used by the library (`WorkflowEvent`, `StepEvent`, `StateEvent`) extend this class and are accessible via `State.get('events.workflow')`, `State.get('events.step')`, and `State.get('events.state')`.

**Extends:** `EventTarget`

## Table of Contents
- [Constructor](#constructor)
- [Methods](#methods)
- [Examples](#examples)
- [Related](#related)

## Constructor

### `new Event()`

Creates a new Event instance. Sub-classes call `registerEvents(event_names)` in their constructor to pre-register sub-event instances.

## Methods

### `emit(event_name, data, bubbles?, cancelable?)` → `boolean`

Dispatches a `CustomEvent` with `detail = data`. Also broadcasts the event over a `BroadcastChannel` named `event_name` for cross-context delivery. Circular references in `data` are stripped via JSON serialization before broadcasting.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `event_name` | `string` | — | Name of the event to dispatch. |
| `data` | `any` | — | Payload attached as `event.detail`. |
| `bubbles` | `boolean` | `false` | Whether the event bubbles through the DOM. |
| `cancelable` | `boolean` | `true` | Whether the event can be cancelled. |

**Returns:** `true` if the event was not cancelled; `false` otherwise.

**Example:**
```javascript
import { State } from '@ronaldroe/micro-flow';

const workflowEvents = State.get('events.workflow');
workflowEvents.emit('workflow_complete', { name: 'my-flow', timing: { execution_time_ms: 42 } });
```

---

### `on(event_name, listener)` → `this`

Registers a persistent event listener using EventEmitter semantics. The `listener` receives `event.detail` directly (the raw `CustomEvent` is unwrapped). The original listener reference is stored in `_listener_map` so it can be removed with `off()`.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `event_name` | `string` | Name of the event to listen for. |
| `listener` | `Function` | Called with the event's `detail` payload. |

**Returns:** `this` (chainable).

**Example:**
```javascript
import { State } from '@ronaldroe/micro-flow';

const stepEvents = State.get('events.step');

stepEvents.on('step_complete', (data) => {
  console.log(`Step "${data.name}" finished in ${data.timing.execution_time_ms}ms`);
});
```

---

### `once(event_name, listener)` → `this`

Registers a one-time event listener that removes itself after firing once.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `event_name` | `string` | Name of the event. |
| `listener` | `Function` | Called once with `event.detail`. |

**Returns:** `this` (chainable).

**Example:**
```javascript
import { State } from '@ronaldroe/micro-flow';

const wfEvents = State.get('events.workflow');

wfEvents.once('workflow_complete', (data) => {
  console.log('First completion:', data.name);
});
```

---

### `off(event_name, listener)` → `this`

Removes a previously registered listener. Uses the internal `_listener_map` to resolve the wrapped listener added during `on()`.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `event_name` | `string` | Name of the event. |
| `listener` | `Function` | The same function reference passed to `on()`. |

**Returns:** `this` (chainable).

---

### `removeListener(event_name, listener)`

Alias for `off(event_name, listener)`.

---

### `onBroadcast(event_name, listener)` → `BroadcastChannel`

Subscribes to broadcast-only events on a `BroadcastChannel` named `event_name`. This listens only for events broadcast from other execution contexts (other tabs, workers), not local dispatches.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `event_name` | `string` | Channel name / event name. |
| `listener` | `Function` | Called with the broadcast message data. |

**Returns:** The `BroadcastChannel` instance, augmented with `.send(data)` and `.destroy()` convenience methods.

**Example:**
```javascript
import { State } from '@ronaldroe/micro-flow';

const wfEvents = State.get('events.workflow');

const channel = wfEvents.onBroadcast('workflow_complete', (data) => {
  console.log('Received from another tab:', data.name);
});

// Destroy the channel when done
channel.destroy();
```

---

### `onAny(event_name, listener)` → `{ event, broadcast }`

Subscribes to both local (`EventTarget`) and broadcast (`BroadcastChannel`) events simultaneously. Ensures the listener fires regardless of which context emitted the event.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `event_name` | `string` | Event / channel name. |
| `listener` | `Function` | Called with the event's detail payload. |

**Returns:** Object with `event` (the EventTarget listener ref) and `broadcast` (the BroadcastChannel instance).

**Example:**
```javascript
import { State } from '@ronaldroe/micro-flow';

const wfEvents = State.get('events.workflow');

const { broadcast } = wfEvents.onAny('workflow_failed', (data) => {
  console.error('Workflow failed (any context):', data.name);
});

// Clean up:
broadcast.destroy();
```

---

### `registerEvents(event_names)`

Pre-registers sub-`Event` instances for each value in `event_names`. Called by subclasses (`WorkflowEvent`, `StepEvent`, `StateEvent`) in their constructors.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `event_names` | `Object` | An enum-like object whose values are event name strings. |

## Examples

### Full listener lifecycle

```javascript
import { Workflow, Step, State } from '@ronaldroe/micro-flow';

const wfEvents = State.get('events.workflow');
const stepEvents = State.get('events.step');

// Track all step starts
const onStepRunning = (data) => console.log(`▶ ${data.name}`);
stepEvents.on('step_running', onStepRunning);

// One-time completion callback
wfEvents.once('workflow_complete', (data) => {
  console.log(`✓ Done in ${data.timing.execution_time_ms}ms`);
  stepEvents.off('step_running', onStepRunning);
});

const wf = new Workflow({
  name: 'demo',
  steps: [
    new Step({ name: 'alpha', callable: async () => 'a' }),
    new Step({ name: 'beta',  callable: async () => 'b' }),
  ],
});

await wf.execute();
```

### Cross-tab synchronization with onAny

```javascript
import { State } from '@ronaldroe/micro-flow';

// In a browser: listen for workflow completions from any tab
const wfEvents = State.get('events.workflow');

const { broadcast } = wfEvents.onAny('workflow_complete', (data) => {
  document.getElementById('status').textContent = `Workflow "${data.name}" complete`;
});

// Clean up when component unmounts
window.addEventListener('unload', () => broadcast.destroy());
```

### Emitting custom events

```javascript
import { State } from '@ronaldroe/micro-flow';

const stateEvents = State.get('events.state');

stateEvents.on('set', (data) => {
  if (data.path?.startsWith('cart.')) {
    console.log('Cart updated:', data.value);
  }
});

State.set('cart.items', [{ id: 1, qty: 2 }]);
```

## Related

- [WorkflowEvent](workflow_event.md) — Registers workflow lifecycle events.
- [StepEvent](step_event.md) — Registers step lifecycle events.
- [StateEvent](state_event.md) — Registers state mutation events.
- [State](../state.md) — Holds the three event instances.
- [workflow_event_names](../../enums/workflow_event_names.md) — Workflow event name enum.
- [step_event_names](../../enums/step_event_names.md) — Step event name enum.
- [state_event_names](../../enums/state_event_names.md) — State event name enum.
