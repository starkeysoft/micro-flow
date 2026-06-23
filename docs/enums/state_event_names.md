# state_event_names

Event names emitted by the `State` singleton in response to state operations. Each event is available on the `StateEvent` instance at `State.get('events.state')`.

## Table of Contents
- [Values](#values)
- [Usage](#usage)
- [Related](#related)

## Values

| Key | Value | Description |
|-----|-------|-------------|
| `SET` | `'set'` | Emitted when `State.set()` is called. |
| `DELETED` | `'deleted'` | Emitted when `State.delete()` is called. |
| `MERGE` | `'merge'` | Emitted when `State.merge()` is called. |
| `RESET` | `'reset'` | Emitted when `State.reset()` is called. |
| `FROZEN` | `'frozen'` | Emitted when `State.freeze()` is called. |
| `GET` | `'get'` | Emitted when `State.get()` is called. |
| `GET_FROM_PROPERTY_PATH` | `'get_from_property_path'` | Emitted during low-level path resolution via `State.getFromPropertyPath()`. |
| `GET_STATE` | `'get_state'` | Emitted when `State.getState()` is called. |
| `EACH` | `'each'` | Emitted for each item visited during `State.each()`. |
| `SET_TO_PROPERTY_PATH` | `'set_to_property_path'` | Emitted during low-level path writes via `State.setToPropertyPath()`. |

## Usage

```javascript
import { State, state_event_names } from '@ronaldroe/micro-flow';

const stateEvents = State.get('events.state');

// Using the enum constant
stateEvents.on(state_event_names.SET, (data) => {
  console.log('Path set:', data.path, '=', data.value);
});

stateEvents.on(state_event_names.DELETED, (data) => {
  console.log('Path deleted:', data.path);
});

stateEvents.on(state_event_names.RESET, () => {
  console.log('State was reset to defaults');
});

stateEvents.on(state_event_names.MERGE, (data) => {
  console.log('State merged with:', data.newState);
});

State.set('user.role', 'admin');  // triggers SET
State.delete('user.role');        // triggers DELETED
State.merge({ version: '2' });    // triggers MERGE
State.reset();                    // triggers RESET
```

Using string values directly also works:

```javascript
import { State } from '@ronaldroe/micro-flow';

State.get('events.state').on('set', (data) => {
  console.log('changed:', data.path);
});
```

## Related

- [StateEvent](../classes/events/state_event.md) — Registers and emits these events.
- [State](../classes/state.md) — The singleton that triggers these events.
