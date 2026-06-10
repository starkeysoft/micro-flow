# StateEvent

The event emitter for state mutation events. Pre-registers all `state_event_names` on construction. Accessed via `State.get('events.state')`.

**Extends:** [Event](event.md)

## Table of Contents
- [Constructor](#constructor)
- [Registered Events](#registered-events)
- [Examples](#examples)
- [Related](#related)

## Constructor

### `new StateEvent()`

Creates a new StateEvent instance and calls `registerEvents(state_event_names)`, pre-registering a sub-`Event` instance for every state event name.

The `StateEvent` instance is created automatically when the library initializes and stored at `State.get('events.state')`. You should not instantiate it directly.

## Registered Events

All events from [`state_event_names`](../../enums/state_event_names.md):

| Event Name | Value | Description |
|------------|-------|-------------|
| `SET` | `'set'` | Emitted whenever `State.set()` is called. |
| `DELETED` | `'deleted'` | Emitted whenever `State.delete()` is called. |
| `MERGE` | `'merge'` | Emitted whenever `State.merge()` is called. |
| `RESET` | `'reset'` | Emitted whenever `State.reset()` is called. |
| `FROZEN` | `'frozen'` | Emitted when `State.freeze()` is called. |
| `GET` | `'get'` | Emitted when `State.get()` is called. |
| `GET_FROM_PROPERTY_PATH` | `'get_from_property_path'` | Emitted during low-level path resolution. |
| `GET_STATE` | `'get_state'` | Emitted when `State.getState()` is called. |
| `EACH` | `'each'` | Emitted for each item during `State.each()` iteration. |
| `SET_TO_PROPERTY_PATH` | `'set_to_property_path'` | Emitted during low-level path writes. |

## Examples

### Watching for state mutations

```javascript
import { State } from '@ronaldroe/micro-flow';

const stateEvents = State.get('events.state');

stateEvents.on('set', (data) => {
  console.log(`State set: ${data.path} =`, data.value);
});

stateEvents.on('deleted', (data) => {
  console.log(`State deleted: ${data.path}`);
});

State.set('user.name', 'Alice');   // logs: State set: user.name = Alice
State.delete('user.name');         // logs: State deleted: user.name
```

### Persisting state to localStorage (browser)

```javascript
import { State } from '@ronaldroe/micro-flow';

const stateEvents = State.get('events.state');

// Automatically persist state on every change
stateEvents.on('set', () => {
  const snapshot = JSON.stringify(State.getState());
  localStorage.setItem('app_state', snapshot);
});

stateEvents.on('deleted', () => {
  const snapshot = JSON.stringify(State.getState());
  localStorage.setItem('app_state', snapshot);
});

stateEvents.on('reset', () => {
  localStorage.removeItem('app_state');
});

// On page load, restore persisted state
const saved = localStorage.getItem('app_state');
if (saved) {
  State.merge(JSON.parse(saved));
}
```

### Audit log for specific paths

```javascript
import { State } from '@ronaldroe/micro-flow';

const stateEvents = State.get('events.state');
const auditLog = [];

stateEvents.on('set', (data) => {
  if (data.path?.startsWith('orders.')) {
    auditLog.push({
      type: 'set',
      path: data.path,
      value: data.value,
      timestamp: new Date().toISOString(),
    });
  }
});

State.set('orders.12345.status', 'shipped');
State.set('orders.12345.trackingId', 'UPS-9876543');

console.log(auditLog);
// [ { type: 'set', path: 'orders.12345.status', value: 'shipped', ... }, ... ]
```

### Using state_event_names enum

```javascript
import { State, state_event_names } from '@ronaldroe/micro-flow';

const stateEvents = State.get('events.state');

stateEvents.on(state_event_names.SET, (data) => {
  console.log('SET event:', data.path);
});

stateEvents.on(state_event_names.RESET, () => {
  console.log('State was reset');
});

State.set('config.debug', true);
State.reset();
```

### Reacting to merges

```javascript
import { State } from '@ronaldroe/micro-flow';

const stateEvents = State.get('events.state');

stateEvents.on('merge', (data) => {
  console.log('State merged. Keys added:', Object.keys(data.newState ?? {}));
});

State.merge({ featureFlags: { darkMode: true }, appVersion: '2.0.0' });
```

## Related

- [Event](event.md) — Base class with `on`, `once`, `off`, `emit`, `onBroadcast`, `onAny`.
- [state_event_names](../../enums/state_event_names.md) — Full enum of registered event names.
- [State](../state.md) — The singleton that emits these events.
