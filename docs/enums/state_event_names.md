# State Event Names

Enumeration of state event names. State operations emit these events when state is accessed or modified.

## Values

- `DELETED` - `'deleted'` - Emitted when a state property is deleted
- `EACH` - `'each'` - Emitted when iterating over a state collection
- `FROZEN` - `'frozen'` - Emitted when the state is frozen (made immutable)
- `GET` - `'get'` - Emitted when a state property is retrieved
- `GET_FROM_PROPERTY_PATH` - `'get_from_property_path'` - Emitted when retrieving via path resolution
- `GET_STATE` - `'get_state'` - Emitted when the entire state object is retrieved
- `MERGE` - `'merge'` - Emitted when an object is merged into the state
- `RESET` - `'reset'` - Emitted when the state is reset to default values
- `SET` - `'set'` - Emitted when a state property is set
- `SET_TO_PROPERTY_PATH` - `'set_to_property_path'` - Emitted when setting via path resolution

## Usage

**Example (Node.js):**
```javascript
import { State, state_event_names } from 'micro-flow';

const stateEvents = State.get('events.state');

// Listen using event name constants
stateEvents.on(state_event_names.SET, (data) => {
  console.log('State was set:', data.state);
});

stateEvents.on(state_event_names.DELETED, (data) => {
  console.log('State property was deleted:', data.state);
});

stateEvents.on(state_event_names.FROZEN, (data) => {
  console.log('State was frozen');
});
```

**Example (Browser):**
```javascript
import { State, state_event_names } from './micro-flow.js';

const stateEvents = State.get('events.state');

// Track all state modifications
const trackingEvents = [
  state_event_names.SET,
  state_event_names.DELETED,
  state_event_names.MERGE,
  state_event_names.RESET
];

trackingEvents.forEach(eventName => {
  stateEvents.on(eventName, (data) => {
    console.log(`[${eventName.toUpperCase()}]`, data.state);
  });
});
```

## Event Descriptions

### Read Operations

#### GET
Emitted whenever `State.get()` is called. Contains the retrieved state value or entire state.

```javascript
State.get('user.name'); // Emits GET event
```

#### GET_FROM_PROPERTY_PATH
Emitted during internal path resolution when `State.getFromPropertyPath()` is called with emit=true.

```javascript
State.getFromPropertyPath('user.profile.email'); // Emits GET_FROM_PROPERTY_PATH event
```

#### GET_STATE
Emitted when the entire state object is retrieved via `State.getState()`.

```javascript
State.getState(); // Emits GET_STATE event
```

### Write Operations

#### SET
Emitted whenever `State.set()` is called to modify state.

```javascript
State.set('user.name', 'Alice'); // Emits SET event
```

#### SET_TO_PROPERTY_PATH
Emitted during internal path resolution when `State.setToPropertyPath()` is called with emit=true.

```javascript
State.setToPropertyPath('config.api.url', 'https://api.example.com'); // Emits SET_TO_PROPERTY_PATH event
```

#### MERGE
Emitted when an object is merged into state using `State.merge()`.

```javascript
State.merge({ theme: 'dark' }); // Emits MERGE event
```

#### DELETED
Emitted when a state property is removed using `State.delete()`.

```javascript
State.delete('user.session'); // Emits DELETED event
```

### State Lifecycle Operations

#### FROZEN
Emitted when the state is frozen (made immutable) using `State.freeze()`.

```javascript
State.freeze(); // Emits FROZEN event
```

#### RESET
Emitted when the state is reset to its default values using `State.reset()`.

```javascript
State.reset(); // Emits RESET event
```

#### EACH
Emitted when iterating over a state collection using `State.each()`.

```javascript
State.each('users', (user, index) => {
  console.log(user);
}); // Emits EACH event
```

## Complete Monitoring Example

```javascript
import { State, state_event_names } from 'micro-flow';

const stateEvents = State.get('events.state');

// Monitor all state events
Object.values(state_event_names).forEach(eventName => {
  stateEvents.on(eventName, (data) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${eventName}:`, data);
  });
});

// Perform various state operations
State.set('app.version', '1.0.0');
State.get('app.version');
State.merge({ settings: { theme: 'dark' } });
State.delete('app.version');
State.reset();
```

## See Also

- [StateEvent](../classes/events/state_event.md) - State event emitter
- [State](../classes/state.md) - State management class
- [Step Event Names](step_event_names.md) - Step lifecycle events
- [Workflow Event Names](workflow_event_names.md) - Workflow lifecycle events
