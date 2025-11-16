# State Class

The `State` class provides a structured way to manage state for workflows, steps, and processes. It offers getter/setter functionality, state merging, cloning, and immutability through freezing.

## Constructor

```javascript
new State(initialState)
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `initialState` | `Object` | No | `{}` | Initial state properties to merge with defaults |

### Example

```javascript
import { State } from 'micro-flow';

const state = new State({
  userId: 123,
  status: 'active',
  data: []
});
```

## Default State

The State class includes these default properties:

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

## Methods

### `get(key, defaultValue)`

Retrieves the value of a state property.

```javascript
get(key: string, defaultValue?: any): any
```

**Parameters:**
- `key` (string) - The property key to retrieve
- `defaultValue` (any, optional) - Value to return if key doesn't exist (default: `null`)

**Returns:**
- The value of the property, or `defaultValue` if not found

**Example:**

```javascript
const state = new State({ userId: 123 });

console.log(state.get('userId')); // 123
console.log(state.get('unknown')); // null
console.log(state.get('unknown', 'default')); // 'default'
```

### `getState()`

Retrieves the entire state object.

```javascript
getState(): Object
```

**Returns:**
- The complete state object

**Example:**

```javascript
const state = new State({ userId: 123, status: 'active' });
const fullState = state.getState();

console.log(fullState);
// { id: null, name: null, ..., userId: 123, status: 'active' }
```

### `getStateClone()`

Creates a deep clone of the entire state object.

```javascript
getStateClone(): Object
```

**Returns:**
- A deep copy of the state object

**Example:**

```javascript
const state = new State({ 
  user: { id: 123, name: 'John' },
  items: [1, 2, 3]
});

const cloned = state.getStateClone();
cloned.user.name = 'Jane'; // Original unchanged

console.log(state.get('user').name); // 'John'
console.log(cloned.user.name); // 'Jane'
```

### `set(key, value)`

Sets the value of a state property.

```javascript
set(key: string, value: any): void
```

**Parameters:**
- `key` (string) - The property key to set
- `value` (any) - The value to assign

**Example:**

```javascript
const state = new State();

state.set('userId', 123);
state.set('status', 'active');
state.set('data', [1, 2, 3]);

console.log(state.get('userId')); // 123
```

### `merge(newState)`

Merges an object into the current state.

```javascript
merge(newState: Object): void
```

**Parameters:**
- `newState` (Object) - Object to merge into current state

**Example:**

```javascript
const state = new State({ userId: 123 });

state.merge({
  status: 'active',
  role: 'admin',
  permissions: ['read', 'write']
});

console.log(state.get('userId')); // 123 (preserved)
console.log(state.get('status')); // 'active' (added)
console.log(state.get('role')); // 'admin' (added)
```

### `freeze()`

Freezes the state object to prevent further modifications.

```javascript
freeze(): void
```

**Example:**

```javascript
const state = new State({ userId: 123 });

state.freeze();

// Attempting to modify frozen state will fail silently
state.set('userId', 456);
console.log(state.get('userId')); // Still 123

state.merge({ status: 'active' }); // No effect
```

### `prepare(start_time, freeze)`

Calculates execution time and optionally freezes the state.

```javascript
prepare(start_time: number, freeze?: boolean): void
```

**Parameters:**
- `start_time` (number) - Timestamp when execution started
- `freeze` (boolean, optional) - Whether to freeze state (default: `true`)

**Example:**

```javascript
const state = new State({ name: 'My Process' });
const startTime = Date.now();

// ... perform work ...

state.prepare(startTime, true);

console.log(state.get('execution_time_ms')); // e.g., 1523
// State is now frozen
```

## Usage Examples

### Basic State Management

```javascript
const state = new State();

// Set individual properties
state.set('step', 1);
state.set('total', 5);
state.set('progress', 20);

// Get properties
const step = state.get('step'); // 1
const progress = state.get('progress'); // 20
```

### Initialization with Data

```javascript
const state = new State({
  userId: 123,
  sessionId: 'abc-def-ghi',
  permissions: ['read', 'write'],
  settings: {
    theme: 'dark',
    notifications: true
  }
});

console.log(state.get('userId')); // 123
console.log(state.get('settings').theme); // 'dark'
```

### State Merging

```javascript
const state = new State({ step: 1 });

// Merge additional data
state.merge({
  step: 2,  // Overwrites existing
  data: { results: [1, 2, 3] },  // Adds new
  status: 'processing'  // Adds new
});

console.log(state.get('step')); // 2
console.log(state.get('data')); // { results: [1, 2, 3] }
```

### Deep Cloning

```javascript
const state = new State({
  user: { id: 1, profile: { name: 'John' } },
  items: [{ id: 1 }, { id: 2 }]
});

const clone = state.getStateClone();

// Modify clone without affecting original
clone.user.profile.name = 'Jane';
clone.items[0].id = 999;

console.log(state.get('user').profile.name); // 'John' (unchanged)
console.log(state.get('items')[0].id); // 1 (unchanged)
```

### Workflow State Usage

```javascript
class WorkflowState extends State {
  constructor(initialState = {}) {
    super({
      steps: [],
      current_step_index: 0,
      output_data: [],
      status: 'pending',
      ...initialState
    });
  }
}

const workflowState = new WorkflowState({
  name: 'Data Pipeline',
  userId: 123
});

workflowState.set('status', 'running');
workflowState.merge({
  current_step_index: 1,
  output_data: [{ result: 'step1' }]
});
```

### Step State Usage

```javascript
const stepState = new State({
  id: 'step-123',
  name: 'Fetch Data',
  type: 'action',
  status: 'pending',
  result: null,
  error: null,
  retry_count: 0,
  max_retries: 3
});

// During execution
stepState.set('status', 'running');
stepState.set('start_time', Date.now());

// On completion
stepState.set('status', 'completed');
stepState.set('result', { data: [1, 2, 3] });
stepState.prepare(stepState.get('start_time'), false);
```

### Immutable State

```javascript
const state = new State({
  config: { timeout: 5000, retries: 3 },
  readonly: true
});

// Freeze to make immutable
state.freeze();

// All modification attempts will fail silently
state.set('config', { timeout: 10000 }); // No effect
state.merge({ newProp: 'value' }); // No effect

console.log(state.get('config').timeout); // Still 5000
```

### State with Execution Timing

```javascript
async function executeWithTiming() {
  const state = new State({ name: 'Timed Operation' });
  const startTime = Date.now();
  
  // Perform work
  await performOperation();
  
  // Calculate execution time and freeze
  state.prepare(startTime, true);
  
  console.log('Execution time:', state.get('execution_time_ms'), 'ms');
  
  return state;
}
```

### Default Values

```javascript
const state = new State();

// Get with default values
const timeout = state.get('timeout', 5000); // 5000 (default)
const maxRetries = state.get('max_retries', 3); // 3 (default)
const config = state.get('config', {}); // {} (default)
```

## Internal Usage

The State class is used internally by:

- **Workflow:** `WorkflowState` extends State
- **Step:** Each step has a State instance
- **Events:** State snapshots in event data

## See Also

- [Workflow Class](./workflow.md) - Uses WorkflowState
- [Step Class](./step.md) - Uses State for step state
- [deep_clone Helper](../helpers/deep-clone.md) - Used by getStateClone()
- [Core Concepts - State Management](../../core-concepts/state-management.md)
