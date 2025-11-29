# State Management

Micro Flow uses a flexible state management system with namespaced workflow state and shared user data.

## Overview

The `State` class provides a singleton key-value store with:
- **Namespaced workflow metadata**: Each workflow's execution context (id, name, steps, status) is isolated under `workflows.{workflow_id}`
- **Shared user data**: Custom data is stored at the root level and accessible across all workflows
- **Workflow stack tracking**: Supports nested workflow execution via `workflow_stack` and `active_workflow_id`

This architecture prevents child workflows from overwriting parent workflow metadata while allowing data sharing.

## State Class

The base `State` class is used by both workflows (via `WorkflowState` subclass) and steps.

### Creating State

```javascript
import { State } from 'micro-flow';

const state = new State({
  userId: 123,
  data: [],
  processedCount: 0
});
```

### Constructor

```javascript
constructor(initialState = {})
```

**Parameters:**
- `initialState` (Object) - Initial state data to merge with default state

## Property Path Notation

State supports flexible path notation for accessing nested properties, array elements, and dynamic keys.

### Dot Notation

Access nested objects using dot-separated paths:

```javascript
state.set('user.profile.name', 'Alice');
state.get('user.profile.name'); // 'Alice'

state.set('config.database.host', 'localhost');
state.get('config.database.host'); // 'localhost'
```

### Bracket Notation

Access array elements and keys with special characters using brackets:

```javascript
// Array indices
state.set('users[0].name', 'Bob');
state.set('users[1].name', 'Charlie');
state.get('users[0].name'); // 'Bob'

// Keys with special characters (hyphens, spaces, etc.)
state.set("settings['api-key']", 'secret123');
state.set("config['my-setting']", 'value');
state.get("settings['api-key']"); // 'secret123'

// Nested arrays
state.set('matrix[0][1]', 42);
state.get('matrix[0][1]'); // 42
```

### Mixed Notation

Combine dot and bracket notation in a single path:

```javascript
// Arrays within nested objects
state.set('data.items[0].properties.name', 'First Item');
state.get('data.items[0].properties.name'); // 'First Item'

// Complex paths with special characters
state.set("users[0].settings['theme-preference'].color", 'dark');
state.get("users[0].settings['theme-preference'].color"); // 'dark'
```

### Automatic Structure Creation

When setting values, intermediate objects and arrays are created automatically:

```javascript
// Creates: { users: [{ name: 'Alice', tags: ['admin'] }] }
state.set('users[0].name', 'Alice');
state.set('users[0].tags[0]', 'admin');

// Creates: { config: { 'api-key': 'secret', endpoints: { primary: '...' } } }
state.set("config['api-key']", 'secret');
state.set('config.endpoints.primary', 'https://api.example.com');
```

**Type Detection:** When creating intermediate structures:
- Numeric keys create arrays: `items[0]` → `items: []`
- Non-numeric keys create objects: `data.key` → `data: {}`

### Path Notation Examples

```javascript
// Simple nested access
state.set('user.email', 'user@example.com');
state.get('user.email'); // 'user@example.com'

// Array of objects
state.set('todos[0]', { title: 'Task 1', done: false });
state.set('todos[1]', { title: 'Task 2', done: true });
state.get('todos[0].title'); // 'Task 1'

// Dynamic keys
state.set("metadata['created-at']", '2025-01-01');
state.set("metadata['updated-by']", 'admin');
state.get("metadata['created-at']"); // '2025-01-01'

// Complex nested structures
state.set('app.modules[0].components[0].props.enabled', true);
state.get('app.modules[0].components[0].props.enabled'); // true

// Deleting with paths
state.delete('users[0].email');
state.delete("config['api-key']");
state.delete('data.items[0].properties.name');
```

## Key Methods

### get(path, defaultValue)

Gets the value of a state property using path notation.

```javascript
// Dot notation
const userId = state.get('userId');

// Bracket notation
const firstUser = state.get('users[0]');

// Mixed notation
const userName = state.get('users[0].profile.name');

// With default value
const count = state.get('processedCount', 0);
```

**Parameters:**
- `path` (string) - Path to the property (dot notation, bracket notation, or mixed)
- `defaultValue` (any, optional) - Default value if path doesn't exist (default: `null`)

**Returns:**
- The value at the path, or `defaultValue` if not found

### set(path, value)

Sets the value of a state property using path notation. Creates intermediate structures automatically.

```javascript
// Dot notation
state.set('userId', 456);

// Bracket notation for arrays
state.set('users[0].name', 'Alice');

// Bracket notation for special keys
state.set("config['api-key']", 'secret');

// Mixed notation
state.set('data.items[0].properties.name', 'Item 1');
```

**Parameters:**
- `path` (string) - Path to the property (dot notation, bracket notation, or mixed)
- `value` (any) - The value to set

### getState()

Gets the entire state object.

```javascript
const fullState = state.getState();
console.log(fullState); // { userId: 123, data: [], ... }
```

**Returns:**
- Object containing all state data

### getStateClone()

Gets a deep clone of the entire state object.

```javascript
const clonedState = state.getStateClone();
// Modifications to clonedState won't affect original
```

**Returns:**
- A deep clone of the state object

### merge(newState)

Merges an object into the current state.

```javascript
state.merge({
  newProp: 'value',
  existingProp: 'updated'
});
```

**Parameters:**
- `newState` (Object) - Object to merge into current state

### freeze()

Freezes the state object to prevent further modifications.

```javascript
state.freeze();
// state.set('key', 'value'); // This will fail
```

### prepare(start_time, freeze)

Prepares the state by calculating execution time and optionally freezing.

```javascript
state.prepare(startTime, true);
```

**Parameters:**
- `start_time` (number) - The start time of execution
- `freeze` (boolean, optional) - Whether to freeze state (default: `true`)

## Default State Properties

The State class includes these default properties:

```javascript
{
  id: null,
  name: null,
  exit_on_failure: false,
  current_step: null,
  steps: [],
  events: null,
  should_break: false,
  should_continue: false
}
```

## State Structure

The global state object has this structure:

```javascript
{
  // Workflow namespaces (isolated per workflow)
  workflows: {
    "workflow-id-1": {
      id: string,              // UUID
      name: string,            // Workflow name
      status: string,          // Current status
      steps: Array<Step>,      // Array of steps
      current_step: Step,      // Currently executing step
      current_step_index: number,
      output_data: Array,      // Results from steps
      create_time: number,
      start_time: number,
      complete_time: number,
      pause_time: number,
      resume_time: number,
      cancel_time: number,
      execution_time_ms: number,
      exit_on_failure: boolean,
      freeze_on_completion: boolean,
      should_break: boolean,
      should_continue: boolean,
      should_skip: boolean,
      should_pause: boolean
    },
    "workflow-id-2": { /* another workflow */ }
  },
  
  // Workflow execution tracking
  active_workflow_id: string,    // Currently executing workflow ID
  workflow_stack: Array<string>, // Stack of workflow IDs for nested execution
  
  // Shared user data (accessible by all workflows)
  userId: any,
  customData: any,
  // ... any other user-defined properties
}
```

## Accessing State in Steps

Steps can access workflow and step state through the context object passed to callables:

```javascript
const step = new Step({
  name: 'Access State',
  type: StepTypes.ACTION,
  callable: async (state, step) => {
    // Access shared user data (root level)
    const userId = state.get('userId');
    const customData = state.get('customData');
    
    // Workflow metadata is isolated (automatically handled internally)
    // The workflow's own id, name, steps, etc. are namespaced
    
    // Get step state
    const stepName = step.getStepStateValue('name');
    const stepType = step.getStepStateValue('type');
    
    // Perform operations
    const userData = await fetchUser(userId);
    
    // Set shared user data
    state.set('userData', userData);
    
    return userData;
  }
});
```

**Important:** 
- Callables receive two parameters: `state` (the global state singleton) and `step` (the current Step instance)
- The `state` parameter provides access to the global state, use it for shared user data
- Use `step.getStepStateValue()` and `step.setStepStateValue()` for step-specific data
- Workflow metadata (id, name, steps, status) is automatically namespaced and isolated

## Passing Initial State

You can pass initial state (user data) to a workflow when executing:

```javascript
const workflow = new Workflow({ name: 'Process User' });

// Pass user data as plain object
const initialState = {
  userId: 123,
  environment: 'production',
  customData: { key: 'value' }
};

// Execute with initial state - this merges into the root level
await workflow.execute(initialState);

// Inside steps, access via state.get()
// The workflow's metadata remains isolated in workflows.{id}
```

## State Immutability

By default, workflow state is frozen after completion when `freeze_on_completion` is `true`:

```javascript
const workflow = new Workflow({
  name: 'My Workflow',
  freeze_on_completion: true  // Default
});

await workflow.execute();

// State is now frozen and cannot be modified
// workflow.state.set('key', 'value'); // This will fail
```

## Deep Cloning

The state system uses deep cloning to prevent unintended mutations:

```javascript
const original = state.getState();
const clone = state.getStateClone();

clone.data.push('new item');
// original.data is unchanged
```

## State Flow

1. **Workflow Created** - Initial state is set
2. **Before Execute** - Optional initial state is merged
3. **During Execution** - State is passed to steps via `setWorkflow()`
4. **Steps Execute** - Steps can read/write workflow state
5. **After Completion** - State is prepared and optionally frozen

## Examples

### Basic State Usage

```javascript
const workflow = new Workflow({ name: 'Data Processor' });

const step1 = new Step({
  name: 'Initialize',
  type: StepTypes.ACTION,
  callable: async (state, step) => {
    // Set workflow state
    state.set('processedItems', []);
    state.set('totalCount', 0);
  }
});

const step2 = new Step({
  name: 'Process',
  type: StepTypes.ACTION,
  callable: async (state, step) => {
    // Read workflow state
    const items = state.get('processedItems');
    
    // Modify and update
    items.push({ id: 1, data: 'processed' });
    state.set('processedItems', items);
    state.set('totalCount', items.length);
  }
});

workflow.pushSteps([step1, step2]);
await workflow.execute();

console.log(workflow.state.get('totalCount')); // 1
```

### Sharing Data Between Steps

```javascript
const workflow = new Workflow({ name: 'Data Pipeline' });

const fetchStep = new Step({
  name: 'Fetch',
  type: StepTypes.ACTION,
  callable: async (state, step) => {
    const data = await fetchData();
    state.set('fetchedData', data);
    return data;
  }
});

const transformStep = new Step({
  name: 'Transform',
  type: StepTypes.ACTION,
  callable: async (state, step) => {
    const data = state.get('fetchedData');
    const transformed = data.map(item => transform(item));
    state.set('transformedData', transformed);
    return transformed;
  }
});

const saveStep = new Step({
  name: 'Save',
  type: StepTypes.ACTION,
  callable: async (state, step) => {
    const data = state.get('transformedData');
    await saveData(data);
    return { saved: data.length };
  }
});

workflow.pushSteps([fetchStep, transformStep, saveStep]);
await workflow.execute();
```

### Using Initial State

```javascript
const workflow = new Workflow({ name: 'User Processor' });

workflow.pushStep(new Step({
  name: 'Process User',
  type: StepTypes.ACTION,
  callable: async (state, step) => {
    // Access initial state (shared user data)
    const userId = state.get('userId');
    const config = state.get('config');
    
    return await processUser(userId, config);
  }
}));

// Execute with initial state (plain object)
const initialState = {
  userId: 123,
  config: { option: 'value' }
};

await workflow.execute(initialState);
```

### State with Step Results

```javascript
const workflow = new Workflow({ name: 'Collect Results' });

const step1 = new Step({
  name: 'Step 1',
  type: StepTypes.ACTION,
  callable: async () => ({ result: 'A' })
});

const step2 = new Step({
  name: 'Step 2',
  type: StepTypes.ACTION,
  callable: async () => ({ result: 'B' })
});

workflow.pushSteps([step1, step2]);
await workflow.execute();

// Access all results
const results = workflow.state.get('output_data');
console.log(results); 
// [
//   { result: { result: 'A' }, state: {...} },
//   { result: { result: 'B' }, state: {...} }
// ]
```

### Nested Workflows with Isolated State

Nested workflows maintain isolated metadata while sharing user data:

```javascript
const childWorkflow = new Workflow({
  name: 'Child Workflow',
  steps: [
    new Step({
      name: 'Child Step',
      type: StepTypes.ACTION,
      callable: async (state, step) => {
        // Access shared user data from parent
        const parentData = state.get('parentData');
        
        // Set shared data accessible to parent
        state.set('childData', 'from child');
        
        // Child's workflow metadata (id, name, steps) is isolated
        return { processed: parentData };
      }
    })
  ]
});

const parentWorkflow = new Workflow({
  name: 'Parent Workflow',
  steps: [
    new Step({
      name: 'Parent Step',
      type: StepTypes.ACTION,
      callable: async ({ workflow }) => {
        state.set('parentData', 'from parent');
      }
    }),
    new Step({
      name: 'Execute Child',
      type: StepTypes.ACTION,
      callable: childWorkflow  // Child workflow as callable
    }),
    new Step({
      name: 'After Child',
      type: StepTypes.ACTION,
      callable: async ({ workflow }) => {
        // Parent's id and name are preserved (not overwritten)
        // Shared data from child is accessible
        const childData = state.get('childData');
        return { childData };
      }
    })
  ]
});

// Parent and child workflows maintain separate metadata
// User data is shared between them
await parentWorkflow.execute();
```

## Best Practices

1. **Use Meaningful Keys** - Use descriptive state keys for clarity
2. **Minimize State** - Only store necessary data in workflow state
3. **Clone When Needed** - Use `getStateClone()` to avoid mutation issues
4. **Initialize Early** - Set initial state in first step or via initialState
5. **Document State Shape** - Document what state keys your workflow expects
6. **Avoid Large Objects** - Keep state lean; store references or IDs instead of full objects
7. **Use Function Parameters** - Callables receive `state` and `step` as parameters for state access
8. **Understand Namespacing** - Workflow metadata is automatically isolated; user data is shared
9. **Nested Workflows** - Use nested workflows freely; their metadata won't conflict

## See Also

- [Workflows](./workflows.md)
- [Steps](./steps.md)
- [State Access](../advanced/state-access.md)
