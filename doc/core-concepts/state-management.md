# State Management

Micro Flow uses a flexible state management system that allows workflows and steps to maintain and share data throughout execution.

## Overview

The `State` class provides a simple key-value store with getter/setter functionality, deep cloning capabilities, and optional immutability. Both workflows and steps maintain their own state instances.

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

## Key Methods

### get(key, defaultValue)

Gets the value of a state property.

```javascript
const userId = state.get('userId');
const count = state.get('processedCount', 0); // with default
```

**Parameters:**
- `key` (string) - The key to retrieve
- `defaultValue` (any, optional) - Default value if key doesn't exist (default: `null`)

**Returns:**
- The value at the key, or `defaultValue` if not found

### set(key, value)

Sets the value of a state property.

```javascript
state.set('userId', 456);
state.set('data', [1, 2, 3]);
```

**Parameters:**
- `key` (string) - The key to set
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
  exit_on_failure: true,
  current_step: null,
  steps: [],
  events: null,
  should_break: false,
  should_continue: false
}
```

## Workflow State

Workflows use `WorkflowState`, which extends `State` with additional workflow-specific properties:

```javascript
{
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
}
```

## Accessing State in Steps

Steps can access workflow and step state through the context object passed to callables:

```javascript
const step = new Step({
  name: 'Access State',
  type: StepTypes.ACTION,
  callable: async ({ workflow, step }) => {
    // Get workflow state
    const userId = workflow.get('userId');
    const allSteps = workflow.get('steps');
    
    // Get step state
    const stepName = step.state.get('name');
    
    // Perform operations
    const userData = await fetchUser(userId);
    
    return userData;
  }
});
```

**Important:** Callables receive a context object `{ workflow, step }` as their first parameter.

## Passing Initial State

You can pass initial state to a workflow when executing:

```javascript
const workflow = new Workflow({ name: 'Process User' });

// Create initial state
const initialState = new WorkflowState({
  userId: 123,
  environment: 'production',
  customData: { key: 'value' }
});

// Execute with initial state
await workflow.execute(initialState);
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
  callable: async ({ workflow, step }) => {
    // Set workflow state
    workflow.set('processedItems', []);
    workflow.set('totalCount', 0);
  }
});

const step2 = new Step({
  name: 'Process',
  type: StepTypes.ACTION,
  callable: async ({ workflow, step }) => {
    // Read workflow state
    const items = workflow.get('processedItems');
    
    // Modify and update
    items.push({ id: 1, data: 'processed' });
    workflow.set('processedItems', items);
    workflow.set('totalCount', items.length);
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
  callable: async ({ workflow, step }) => {
    const data = await fetchData();
    workflow.set('fetchedData', data);
    return data;
  }
});

const transformStep = new Step({
  name: 'Transform',
  type: StepTypes.ACTION,
  callable: async ({ workflow, step }) => {
    const data = workflow.get('fetchedData');
    const transformed = data.map(item => transform(item));
    workflow.set('transformedData', transformed);
    return transformed;
  }
});

const saveStep = new Step({
  name: 'Save',
  type: StepTypes.ACTION,
  callable: async ({ workflow, step }) => {
    const data = workflow.get('transformedData');
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
  callable: async ({ workflow, step }) => {
    // Access initial state
    const userId = workflow.get('userId');
    const config = workflow.get('config');
    
    return await processUser(userId, config);
  }
}));

// Execute with initial state
const initialState = new WorkflowState({
  userId: 123,
  config: { option: 'value' }
});

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

## Best Practices

1. **Use Meaningful Keys** - Use descriptive state keys for clarity
2. **Minimize State** - Only store necessary data in workflow state
3. **Clone When Needed** - Use `getStateClone()` to avoid mutation issues
4. **Initialize Early** - Set initial state in first step or via initialState
5. **Document State Shape** - Document what state keys your workflow expects
6. **Avoid Large Objects** - Keep state lean; store references or IDs instead of full objects
7. **Use Context Parameter** - Callables receive `{ workflow, step }` as the first parameter for state access

## See Also

- [Workflows](./workflows.md)
- [Steps](./steps.md)
- [State Access](../advanced/state-access.md)
