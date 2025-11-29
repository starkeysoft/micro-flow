# Steps

Steps are the building blocks of workflows in Micro Flow. Each step represents a discrete unit of work with its own callable function, lifecycle, and event system.

## Overview

The base `Step` class provides lifecycle management, event handling, and execution capabilities. All specialized step types (DelayStep, ConditionalStep, etc.) extend this base class.

## Creating a Step

```javascript
import { Step, StepTypes } from 'micro-flow';

const step = new Step({
  name: 'Fetch User Data',
  type: StepTypes.ACTION,
  callable: async (state, step) => {
    const response = await fetch('/api/user');
    return response.json();
  }
});
```

## Constructor Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `name` | `string` | Yes | Name of the step |
| `type` | `string` | Yes | Step type from StepTypes enum |
| `callable` | `Function\|Step\|Workflow` | No | The async function, Step, or Workflow to execute (default: `async()=>{}`) |

## Step Types

The library includes several specialized step types:

- **ACTION** - Generic step for executing functions
- **DELAY** - Time-based delays (DelayStep)
- **LOGIC** - Conditional logic (ConditionalStep, LoopStep, etc.)

See [Step Types](../step-types/README.md) for detailed documentation on specialized steps.

## Key Methods

### execute()

Executes the step's callable function. The callable receives two parameters: `state` (the global state singleton) and `step` (the current Step instance). Changes to the state will affect all workflows and steps. 

```javascript
const result = await step.execute();
// Returns: { result: <callable_result>, state: <step_state> }
```

**Returns:**
- `Promise<Object>` - Object containing `result` and `state`

**Throws:**
- `Error` if the callable throws an error

### setCallable(callable)

Sets or updates the callable function for the step.

```javascript
step.setCallable(async () => {
  return 'New implementation';
});
```

**Parameters:**
- `callable` (Function|Step|Workflow) - The function to execute

### setWorkflow(workflow)

Sets the workflow state reference for this step. This is called by the parent workflow before step execution to provide access to the workflow's state data.

```javascript
// Called automatically by workflow before execution
step.setWorkflow(workflowState);

// Access in callable via context parameter
callable: async (state, step) => {
  const workflowData = state.get('customData');
  // ...
}
```

**Parameters:**
- `workflow_state` (WorkflowState) - The WorkflowState instance from the parent workflow

## Lifecycle Methods

### markAsRunning()

Marks the step as running and emits a STEP_RUNNING event.

```javascript
step.markAsRunning();
```

### markAsComplete()

Marks the step as complete and emits a STEP_COMPLETED event.

```javascript
step.markAsComplete();
```

### markAsFailed(error)

Marks the step as failed and emits a STEP_FAILED event.

```javascript
step.markAsFailed('Something went wrong');
```

### markAsWaiting()

Marks the step as waiting and emits a STEP_WAITING event.

```javascript
step.markAsWaiting();
```

### markAsPending()

Marks the step as pending and emits a STEP_PENDING event.

```javascript
step.markAsPending();
```

## Step Statuses

Steps can have the following statuses (from `StepStatuses` enum):

- `WAITING` - Initial state, waiting to execute
- `PENDING` - Queued for execution (used for steps after delays)
- `RUNNING` - Currently executing
- `COMPLETE` - Successfully finished
- `FAILED` - Execution failed with an error

## State Access

Steps have access to workflow and step state during execution through the context object:

```javascript
const step = new Step({
  name: 'Process with Context',
  type: StepTypes.ACTION,
  callable: async (state, step) => {
    // Access workflow state
    const userId = state.get('userId');
    const steps = state.get('steps');
    
    // Access step state
    const stepName = step.state.get('name');
    
    // Perform work
    const userData = await fetchUser(userId);
    
    return userData;
  }
});
```

**Important:** Callables receive two parameters: `state` (the global state singleton) and `step` (the current Step instance).

## Step State Properties

Each step maintains its own state with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier (UUID) |
| `name` | `string` | Step name |
| `type` | `string` | Step type |
| `status` | `string` | Current status |
| `callable` | `Function` | The executable function |
| `start_time` | `number` | When execution started |
| `execution_time_ms` | `number` | Time taken to execute |
| `log_suppress` | `boolean` | Whether logging is suppressed |

## Events

Steps emit events throughout their lifecycle:

```javascript
step.events.on('STEP_RUNNING', (data) => {
  console.log('Step started:', data.step.state.get('name'));
});

step.events.on('STEP_COMPLETED', (data) => {
  console.log('Step completed:', data.result);
});

step.events.on('STEP_FAILED', (data) => {
  console.error('Step failed:', data.error);
});
```

See [Events Documentation](./events.md) for all available events.

## Callable Types

Steps support three types of callables:

### 1. Function

A simple async function:

```javascript
new Step({
  name: 'Function Step',
  type: StepTypes.ACTION,
  callable: async () => {
    return 'Hello World';
  }
});
```

### 2. Step

Another step instance:

```javascript
const innerStep = new Step({
  name: 'Inner Step',
  type: StepTypes.ACTION,
  callable: async () => 'Inner result'
});

const outerStep = new Step({
  name: 'Outer Step',
  type: StepTypes.ACTION,
  callable: innerStep
});
```

### 3. Workflow

An entire workflow:

```javascript
const subWorkflow = new Workflow({
  name: 'Sub Workflow',
  steps: [step1, step2, step3]
});

const step = new Step({
  name: 'Run Sub Workflow',
  type: StepTypes.ACTION,
  callable: subWorkflow
});
```

## Examples

### Simple Action Step

```javascript
const greetingStep = new Step({
  name: 'Greet User',
  type: StepTypes.ACTION,
  callable: async () => {
    console.log('Hello, User!');
    return 'Greeting sent';
  }
});
```

### Step with Workflow State Access

```javascript
const processStep = new Step({
  name: 'Process Data',
  type: StepTypes.ACTION,
  callable: async function() {
    // Access workflow state
    const inputData = this.state.get('inputData');
    
    // Process data
    const processed = inputData.map(item => item * 2);
    
    // Return result
    return processed;
  }
});
```

### Step with Error Handling

```javascript
const robustStep = new Step({
  name: 'Fetch with Retry',
  type: StepTypes.ACTION,
  callable: async () => {
    let retries = 3;
    while (retries > 0) {
      try {
        return await fetchData();
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        await delay(1000);
      }
    }
  }
});

robustStep.events.on('STEP_FAILED', (data) => {
  console.error('All retries failed:', data.error);
});
```

### Nested Step

```javascript
const innerStep = new Step({
  name: 'Inner Process',
  type: StepTypes.ACTION,
  callable: async () => 'Inner result'
});

const outerStep = new Step({
  name: 'Outer Process',
  type: StepTypes.ACTION,
  callable: innerStep
});
```

## Best Practices

1. **Use Descriptive Names** - Make step names clear and specific
2. **Keep Steps Focused** - Each step should do one thing well
3. **Handle Errors Gracefully** - Use try-catch in callables or listen for STEP_FAILED events
4. **Access State Properly** - Use regular functions (not arrow functions) when accessing `this.workflow`
5. **Return Meaningful Data** - Return data that may be useful for subsequent steps
6. **Monitor Execution** - Use step events for logging and debugging
7. **Test Independently** - Test each step's callable separately before integration

## See Also

- [Workflows](./workflows.md)
- [State Management](./state-management.md)
- [Events](./events.md)
- [Step Types](../step-types/README.md)
