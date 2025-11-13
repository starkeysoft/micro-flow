# State

**Class representing the state of a workflow or process with getter/setter functionality.**

## Overview

The `State` class provides a structured way to manage workflow state with methods for getting, setting, merging, and freezing state data.

## Class Definition

```javascript
class State
```

**Extends:** None  
**Location:** `src/classes/state.js`

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `defaultState` | `Object` (static) | Default state template |
| `state` | `Object` | Current state object |

### Default State Structure

```javascript
{
  id: null,
  name: null,
  exit_on_failure: true,
  current_step: null,
  steps: [],
  events: null,
  should_break: false,
  should_continue: false
}
```

## Constructor

### `constructor(initialState)`

Creates a new State instance.

**Parameters:**

- `initialState` (Object) *[optional]* - Optional initial state to merge with default state (default: `{}`)

**Example:**

```javascript
const state = new State({ 
  id: 'workflow-1',
  name: 'My Workflow' 
});
```

## Methods

### `get(key)`

Gets the value of a state property.

**Parameters:**

- `key` (string) - The key of the state property to get

**Returns:** `*` - The value of the state property

**Example:**

```javascript
const name = state.get('name');
```

---

### `getState()`

Gets the entire state object.

**Returns:** `Object` - The entire state object

**Example:**

```javascript
const fullState = state.getState();
```

---

### `getStateClone()`

Gets a deep clone of the entire state object using the [`deep_clone`](./deep_clone.md) utility.

**Returns:** `Object` - A deep clone of the entire state object

**Example:**

```javascript
const clonedState = state.getStateClone();
```

**See Also:** [deep_clone utility](./deep_clone.md) for details on cloning behavior

---

### `set(key, value)`

Sets the value of a state property.

**Parameters:**

- `key` (string) - The key of the state property to set
- `value` (*) - The value to set

**Example:**

```javascript
state.set('current_step', stepInstance);
```

---

### `merge(newState)`

Merges an object into the current state.

**Parameters:**

- `newState` (Object) - The object to merge into the current state

**Example:**

```javascript
state.merge({ 
  userData: { name: 'John' },
  processed: true 
});
```

---

### `freeze()`

Freezes the state object to prevent further modifications.

**Returns:** `void`

**Example:**

```javascript
state.freeze();
// Further modifications will throw errors
```

---

### `prepare(start_time)`

Prepares the state by calculating execution time and freezing the state.

**Parameters:**

- `start_time` (number) - The start time of the execution (from `Date.now()`)

**Returns:** `void`

**Example:**

```javascript
const startTime = Date.now();
// ... workflow execution ...
state.prepare(startTime);
console.log(state.get('execution_time_ms')); // Execution time in milliseconds
```

## Usage Examples

### Basic State Management

```javascript
import { State } from './classes';

const state = new State();

// Set individual values
state.set('name', 'Data Processing');
state.set('steps', [step1, step2]);

// Get values
console.log(state.get('name')); // 'Data Processing'

// Merge additional data
state.merge({
  userId: 123,
  processedItems: []
});
```

### With Workflow

```javascript
import { Workflow, State } from './classes';

const workflow = new Workflow();

// Access workflow state
const state = workflow.state;

// Add custom data
state.merge({
  user: currentUser,
  startTime: Date.now()
});

// Execute workflow
await workflow.execute();

// State is automatically prepared (with execution_time_ms) and frozen after completion
console.log(state.get('execution_time_ms'));
```

### Immutable State

```javascript
const state = new State({ id: 'abc' });

state.set('value', 100);
console.log(state.get('value')); // 100

// Freeze to make immutable
state.freeze();

// This will throw an error
try {
  state.set('value', 200);
} catch (error) {
  console.error('State is frozen');
}
```

## Best Practices

1. **Initialize Early**: Set initial state before workflow execution
2. **Use Merge**: Use `merge()` for batch updates
3. **Freeze When Done**: Freeze state after workflow completion
4. **Document Schema**: Document expected state properties
5. **Avoid Direct Access**: Use getter/setter methods

## Related Classes

- [Workflow](../base-classes/Workflow.md) - Uses State for workflow state management
