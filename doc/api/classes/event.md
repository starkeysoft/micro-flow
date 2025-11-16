# Event Class

The `Event` class provides cross-platform event management compatible with both Node.js and browsers. It extends `EventTarget` and provides both addEventListener/removeEventListener and EventEmitter-style on/off methods.

## Constructor

```javascript
new Event()
```

### Example

```javascript
import { Event } from 'micro-flow';

const eventEmitter = new Event();
```

## Properties

### `events`
- **Type:** `Object`
- **Description:** Registry of registered event instances

### `_listener_map`
- **Type:** `WeakMap`
- **Description:** Internal map for tracking listener wrappers (for removeListener)

## Methods

### `registerEvents(event_names)`

Registers multiple events by creating Event instances for each event name.

```javascript
registerEvents(event_names: Object): void
```

**Parameters:**
- `event_names` (Object) - Object containing event name constants

**Example:**

```javascript
const eventEmitter = new Event();
const eventNames = {
  DATA_LOADED: 'DATA_LOADED',
  DATA_SAVED: 'DATA_SAVED',
  ERROR_OCCURRED: 'ERROR_OCCURRED'
};

eventEmitter.registerEvents(eventNames);
```

### `emit(event_name, data, bubbles, cancelable)`

Emits a custom event with optional data payload.

```javascript
emit(event_name: string, data?: any, bubbles?: boolean, cancelable?: boolean): boolean
```

**Parameters:**
- `event_name` (string) - Name of the event to emit
- `data` (any, optional) - Data to pass with the event
- `bubbles` (boolean, optional) - Whether event should bubble (default: `false`)
- `cancelable` (boolean, optional) - Whether event is cancelable (default: `true`)

**Returns:**
- `boolean` - True if event was not cancelled, false if cancelled

**Example:**

```javascript
const emitter = new Event();

emitter.emit('USER_LOGGED_IN', {
  userId: 123,
  timestamp: Date.now()
});
```

### `on(event_name, listener)`

Adds an event listener with EventEmitter-style API.

```javascript
on(event_name: string, listener: Function): Event
```

**Parameters:**
- `event_name` (string) - Name of event to listen for
- `listener` (Function) - Callback function

**Returns:**
- `Event` - Returns this for chaining

**Example:**

```javascript
const emitter = new Event();

emitter.on('DATA_LOADED', (data) => {
  console.log('Data loaded:', data);
});

emitter.emit('DATA_LOADED', { records: [1, 2, 3] });
```

### `once(event_name, listener)`

Adds a one-time event listener with EventEmitter-style API.

```javascript
once(event_name: string, listener: Function): Event
```

**Parameters:**
- `event_name` (string) - Name of event to listen for
- `listener` (Function) - Callback function (executed once)

**Returns:**
- `Event` - Returns this for chaining

**Example:**

```javascript
const emitter = new Event();

emitter.once('INITIALIZED', () => {
  console.log('Initialized (fires once)');
});

emitter.emit('INITIALIZED');
emitter.emit('INITIALIZED'); // Listener not called
```

### `off(event_name, listener)`

Removes an event listener with EventEmitter-style API.

```javascript
off(event_name: string, listener: Function): Event
```

**Parameters:**
- `event_name` (string) - Name of event
- `listener` (Function) - The listener function to remove

**Returns:**
- `Event` - Returns this for chaining

**Example:**

```javascript
const emitter = new Event();

const handler = (data) => console.log(data);

emitter.on('EVENT', handler);
emitter.off('EVENT', handler); // Remove listener
```

## Usage Examples

### Basic Event Emitter

```javascript
import { Event } from 'micro-flow';

const emitter = new Event();

// Add listener
emitter.on('message', (data) => {
  console.log('Received:', data.text);
});

// Emit event
emitter.emit('message', { text: 'Hello World' });
```

### Multiple Listeners

```javascript
const emitter = new Event();

emitter.on('data', (data) => console.log('Handler 1:', data));
emitter.on('data', (data) => console.log('Handler 2:', data));
emitter.on('data', (data) => console.log('Handler 3:', data));

emitter.emit('data', { value: 42 });
// Output:
// Handler 1: { value: 42 }
// Handler 2: { value: 42 }
// Handler 3: { value: 42 }
```

### Method Chaining

```javascript
const emitter = new Event();

emitter
  .on('start', () => console.log('Started'))
  .on('progress', (data) => console.log('Progress:', data.percent))
  .on('complete', () => console.log('Completed'));

emitter.emit('start');
emitter.emit('progress', { percent: 50 });
emitter.emit('complete');
```

### One-Time Listeners

```javascript
const emitter = new Event();

emitter.once('init', () => {
  console.log('Initialization complete');
});

emitter.emit('init'); // Logs: "Initialization complete"
emitter.emit('init'); // Nothing happens
```

### Removing Listeners

```javascript
const emitter = new Event();

function handler(data) {
  console.log('Handler called:', data);
}

emitter.on('event', handler);
emitter.emit('event', 'test1'); // Logs

emitter.off('event', handler);
emitter.emit('event', 'test2'); // Nothing happens
```

### Event Registration

```javascript
const emitter = new Event();

const EventTypes = {
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  DATA_FETCH: 'DATA_FETCH'
};

emitter.registerEvents(EventTypes);

// Now events are registered
emitter.on(EventTypes.USER_LOGIN, (user) => {
  console.log('User logged in:', user.name);
});
```

### Cross-Platform Usage

```javascript
// Works in both Node.js and browsers
const emitter = new Event();

// EventEmitter-style (Node.js familiar)
emitter.on('data', handleData);

// Or EventTarget-style (Browser familiar)
emitter.addEventListener('data', (event) => {
  handleData(event.detail);
});
```

### Error Handling

```javascript
const emitter = new Event();

emitter.on('error', (error) => {
  console.error('Error occurred:', error.message);
});

try {
  // Some operation
  throw new Error('Something went wrong');
} catch (error) {
  emitter.emit('error', error);
}
```

## Browser Compatibility

The Event class is compatible with:
- **Node.js:** v14.5+ (EventTarget support)
- **Browsers:** All modern browsers with EventTarget support

## API Styles

The Event class supports both API styles:

### EventEmitter Style (Node.js)

```javascript
emitter.on('event', handler);
emitter.once('event', handler);
emitter.off('event', handler);
emitter.emit('event', data);
```

### EventTarget Style (Browser)

```javascript
emitter.addEventListener('event', (e) => handler(e.detail));
emitter.removeEventListener('event', handler);
emitter.dispatchEvent(new CustomEvent('event', { detail: data }));
```

## Internal Usage

The Event class is used as the base for:
- **StepEvent** - Step lifecycle events
- **WorkflowEvent** - Workflow lifecycle events

## See Also

- [StepEvent Class](./step-event.md) - Step-specific events
- [WorkflowEvent Class](./workflow-event.md) - Workflow-specific events
- [step_event_names Enum](../enums/step-event-names.md)
- [workflow_event_names Enum](../enums/workflow-event-names.md)
- [Core Concepts - Events](../../core-concepts/events.md)
