# Event

Broadcast and listen for lifecycle events across workflows, steps, and state mutations. The `Event` class provides a unified, cross-platform emitter that maintains standard Node compatibility while leveraging native browser capabilities.

This class powers the library's ability to communicate across multiple logic flows and—most uniquely—across different execution contexts like browser tabs and workers via the native **BroadcastChannel API**.

Extends: `EventTarget`

## Constructor

### `new Event()`

Initializes a new Event instance.

## Methods

### `emit(event_name, data, bubbles, cancelable)`

Emits a custom event with an optional data payload. This method maintains full API compatibility with standard `EventEmitter` while using the native `CustomEvent` under the hood.

**Parameters:**
- `event_name` (string) - The name of the event to broadcast.
- `data` (any, optional) - The payload to attach to the event.
- `bubbles` (boolean, optional) - Whether the event should bubble through the DOM (default: `false`).
- `cancelable` (boolean, optional) - Whether the event is cancelable (default: `true`).

**Returns:** boolean - True if the event was not cancelled.

## Distributed Communication

One of the core strengths of `micro-flow` is its native support for distributed events.

### `onBroadcast(event_name, listener)`

Subscribes to broadcasts on a specific event name/channel. This allows you to react to events triggered in separate processes, workers, or browser windows.

**Parameters:**
- `event_name` (string) - The channel to monitor.
- `listener` (Function) - Executed when broadcast data is received.

### `onAny(event_name, listener)`

Subscribes to both **local** and **broadcast** events simultaneously. Use this to ensure your application logic reacts to a signal regardless of which execution context emitted it.

### `on(event_name, listener)`

Adds an event listener using an EventEmitter-style API.

### `once(event_name, listener)`

Adds a one-time event listener.

### `off(event_name, listener)`

Removes a previously registered event listener.
