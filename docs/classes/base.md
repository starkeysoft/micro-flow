# Base

Base class for workflows and steps. Provides common functionality for timing, status management, logging, and state access.

## Constructor

### `new Base(options)`

Creates a new Base instance.

**Parameters:**
- `options` (Object) - Configuration options
  - `name` (string, optional) - Name of the instance
  - `base_type` (string, optional) - Type of the base instance (default: `base_types.STEP`)

**Example (Node.js):**
```javascript
import { Base, base_types } from 'micro-flow';

const baseInstance = new Base({
  name: 'my-base',
  base_type: base_types.STEP
});
```

**Example (Browser):**
```javascript
import { Base, base_types } from './micro-flow.js';

const baseInstance = new Base({
  name: 'browser-base',
  base_type: base_types.WORKFLOW
});
```

## Properties

- `id` (string) - Unique identifier (UUID v4)
- `name` (string) - Name of the instance
- `base_type` (string) - Type of the instance
- `timing` (Object) - Timing information
  - `cancel_time` (Date|null) - When the instance was cancelled
  - `complete_time` (Date|null) - When the instance completed
  - `end_time` (Date|null) - When the instance ended
  - `execution_time_ms` (number|null) - Total execution time in milliseconds
  - `start_time` (Date|null) - When the instance started

## Methods

### `async execute()`

Executes the instance. Must be overridden by subclasses.

**Returns:** Promise

**Throws:** Error if not implemented in subclass

---

### `log(event_name, message)`

Logs an event and emits it to the appropriate event emitter.

**Parameters:**
- `event_name` (string) - Name of the event to log
- `message` (string, optional) - Optional message to log

**Throws:** Error if event name is invalid or event emitter not found

**Example (Node.js):**
```javascript
import { Step } from 'micro-flow';

const step = new Step({
  name: 'logging-step',
  callable: async () => {
    console.log('Task completed');
  }
});

// Log is called internally during execution
await step.execute();
```

---

### `markAsComplete()`

Marks the instance as complete and calculates execution time.

**Example (Browser):**
```javascript
// Called internally by execute()
// Sets status to COMPLETE and calculates timing.execution_time_ms
```

---

### `markAsFailed()`

Marks the instance as failed and calculates execution time.

---

### `markAsWaiting()`

Marks the instance as waiting. To be implemented by subclasses.

---

### `markAsPending()`

Marks the instance as pending. To be implemented by subclasses.

---

### `markAsRunning()`

Marks the instance as running and sets the start time.

---

### `getState(path)`

Gets a value from the global state.

**Parameters:**
- `path` (string) - Path to the state property

**Returns:** Any - The state value at the specified path

**Example (Node.js):**
```javascript
import { Step } from 'micro-flow';

const step = new Step({
  name: 'state-reader',
  callable: async () => {
    const workflows = step.getState('workflows');
    console.log('Active workflows:', Object.keys(workflows));
  }
});
```

---

### `setState(path, value)`

Sets a value in the global state.

**Parameters:**
- `path` (string) - Path to the state property
- `value` (any) - Value to set

**Example (Browser):**
```javascript
const step = new Step({
  name: 'state-writer',
  callable: async () => {
    step.setState('custom.setting', true);
  }
});
```

---

### `deleteState(path)`

Deletes a property from the global state.

**Parameters:**
- `path` (string) - Path to the state property to delete

## See Also

- [Workflow](workflow.md) - Extends Base
- [Step](steps/step.md) - Extends Base
- [State](state.md) - Global state management
