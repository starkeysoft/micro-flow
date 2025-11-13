# Event

**Base event class that extends EventTarget for cross-platform event management.**

## Overview

The `Event` class provides a unified event system compatible with both Node.js (v14.5+) and web browsers. It combines the native EventTarget API with EventEmitter-style methods for flexible event handling.

## Class Definition

```javascript
class Event extends EventTarget
```

**Extends:** EventTarget  
**Location:** `src/classes/event.js`

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `events` | `Object` | `{}` | Registered events map |
| `_listener_map` | `WeakMap` | `new WeakMap()` | Internal listener mapping |

## Constructor

### `constructor()`

Creates a new Event instance.

**Example:**

```javascript
const events = new Event();
```

## Methods

### `registerEvents(event_names)`

Registers multiple events by creating Event instances for each event name.

**Parameters:**

- `event_names` (Object) - An object containing event name constants

**Returns:** `void`

---

### `emit(event_name, data, bubbles, cancelable)`

Emits a custom event with optional data payload. Maintains API compatibility with EventEmitter while using CustomEvent.

**Parameters:**

- `event_name` (string) - The name of the event to emit
- `data` (*) - Optional data to pass with the event
- `bubbles` (boolean) *[optional]* - Whether the event should bubble (default: `false`)
- `cancelable` (boolean) *[optional]* - Whether the event is cancelable (default: `true`)

**Returns:** `boolean` - True if the event was dispatched successfully

**Example:**

```javascript
events.emit('user_created', { userId: 123, name: 'John' });
```

---

### `on(event_name, listener)`

Adds an event listener with EventEmitter-style API.

**Parameters:**

- `event_name` (string) - The name of the event to listen for
- `listener` (Function) - The callback function

**Returns:** `Event` - Returns this for chaining

**Example:**

```javascript
events.on('user_created', (data) => {
  console.log('User created:', data.userId);
});
```

---

### `once(event_name, listener)`

Adds a one-time event listener.

**Parameters:**

- `event_name` (string) - The name of the event to listen for
- `listener` (Function) - The callback function

**Returns:** `Event` - Returns this for chaining

**Example:**

```javascript
events.once('initialized', () => {
  console.log('Initialized once');
});
```

---

### `off(event_name, listener)`

Removes an event listener.

**Parameters:**

- `event_name` (string) - The name of the event
- `listener` (Function) - The callback function to remove

**Returns:** `Event` - Returns this for chaining

**Example:**

```javascript
const handler = (data) => console.log(data);
events.on('event', handler);
events.off('event', handler);
```

---

### `removeListener(event_name, listener)`

Alias for `off()` to maintain EventEmitter API compatibility.

**Parameters:**

- `event_name` (string) - The name of the event
- `listener` (Function) - The callback function to remove

**Returns:** `Event` - Returns this for chaining

## Usage Examples

### Basic Event Handling

```javascript
import { Event } from './classes';

const events = new Event();

// Add listener
events.on('data_received', (data) => {
  console.log('Received:', data);
});

// Emit event
events.emit('data_received', { value: 42 });
```

### One-Time Events

```javascript
events.once('startup', () => {
  console.log('This runs only once');
});

events.emit('startup');
events.emit('startup'); // Handler not called
```

### Removing Listeners

```javascript
const handler = (data) => {
  console.log('Handling:', data);
};

events.on('process', handler);
events.emit('process', { id: 1 });

// Remove listener
events.off('process', handler);
events.emit('process', { id: 2 }); // Handler not called
```

## Related Classes

- [StepEvent](StepEvent.md) - Step-specific events
- [WorkflowEvent](WorkflowEvent.md) - Workflow-specific events
