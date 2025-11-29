# Broadcast Class

The `Broadcast` class provides a simplified wrapper around the BroadcastChannel API for cross-context communication (e.g., between browser tabs, windows, workers, or workflows).

## Relationship to Event

For local workflow or step event handling, use the [`Event`](./event.md) class. `Broadcast` is designed for global or cross-context event propagation.

## Import

```javascript
import Broadcast from 'micro-flow/src/classes/broadcast.js';
```

## Constructor

```javascript
new Broadcast(channelName)
```

Creates a new Broadcast instance for a named channel.

**Parameters:**
- `channelName` (string) - The name of the broadcast channel

**Example:**

```javascript
const broadcast = new Broadcast('notifications');
```

## Methods

### `send(data)`

Sends data to all other contexts listening on this channel.

```javascript
broadcast.send({ action: 'refresh', timestamp: Date.now() });
```

### `onReceive(callback)`

Registers a callback to handle incoming messages.

```javascript
broadcast.onReceive((data) => {
  console.log('Received broadcast:', data);
});
```

## Example: Integrating with Event

```javascript
import Event from 'micro-flow/src/classes/event.js';
import Broadcast from 'micro-flow/src/classes/broadcast.js';

const localEvent = new Event();
const broadcast = new Broadcast('workflow-global');

localEvent.on('COMPLETE', () => {
  broadcast.send({ type: 'COMPLETE', time: Date.now() });
});

broadcast.onReceive((msg) => {
  if (msg.type === 'COMPLETE') {
    console.log('A workflow completed at', msg.time);
  }
});
```

```javascript
broadcast.onReceive((data) => {
  console.log('Received message:', data);
});
```

### `destroy()`

Closes the broadcast channel and releases resources.

```javascript
broadcast.destroy();
```

## Usage Example

```javascript
// Tab 1
const broadcast = new Broadcast('app-events');
broadcast.send({ type: 'data-updated', id: 123 });

// Tab 2
const broadcast = new Broadcast('app-events');
broadcast.onReceive((message) => {
  if (message.type === 'data-updated') {
    refreshData(message.id);
  }
});
```

## Browser Support

Requires BroadcastChannel API support. Not available in Node.js.

## See Also

- [MDN BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)
