# Step Class

The `Step` class is the base class for all workflow steps in Micro Flow. It provides the foundation for step execution, state management, and event handling.

## Constructor

```javascript
new Step(options)
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `options.name` | `string` | Yes | - | Name for the step |
| `options.type` | `string` | Yes | - | Step type from StepTypes enum |
| `options.callable` | `Function \| Step \| Workflow` | No | `async()=>{}` | The async function, Step, or Workflow to execute for this step |

### Example

```javascript
import { Step, StepTypes } from 'micro-flow';

const step = new Step({
  name: 'Fetch Data',
  type: StepTypes.ACTION,
  callable: async (state, step) => {
    const response = await fetch('/api/data');
    return response.json();
  }
});
```

## Properties

### `events`
- **Type:** `StepEvent`
- **Description:** Event emitter for step lifecycle events
- **Read-only:** Yes

```javascript
step.events.on('STEP_COMPLETED', (data) => {
  console.log('Step completed:', data.step.name);
});
```

### `state`
- **Type:** `State`
- **Description:** Step state instance containing all state data
- **Read-only:** No (but properties are managed through methods)

```javascript
const status = step.state.get('status');
const result = step.state.get('result');
```

### `workflow`
- **Type:** `WorkflowState | null`
- **Description:** Reference to the workflow state (set by workflow before execution via `setWorkflow()`)
- **Read-only:** No

```javascript
// Access workflow state from within step callable
const callable = async function(state, step) {
  const workflowStatus = state.get('status');
  const allSteps = state.get('steps');
  return processData(workflow);
};
```

## Methods

### `execute(data)`

Executes the step's callable function. The workflow state is available via `this.workflow`, which is set by the parent workflow through `setWorkflow()` before execution.

```javascript
async execute(workflow?: WorkflowState): Promise<{ result: any, state: Object }>
```

**Parameters:**
- `workflow` (WorkflowState, optional) - The workflow state passed from the parent workflow

**Returns:**
- `Promise<Object>` - Object with `result` (callable return value) and `state` (final step state via `getState()`)

**Throws:**
- `Error` if the callable function throws an error during execution

**Emits:**
- `STEP_RUNNING` - When step starts executing
- `STEP_COMPLETED` - When step completes successfully
- `STEP_FAILED` - When step fails
- `STEP_FAILED` - When step fails after all retries
- `STEP_RETRY` - When step is retrying after failure
- `STEP_TIMEOUT` - When step exceeds timeout limit

**Example:**

```javascript
const step = new Step({
  name: 'Process',
  type: StepTypes.ACTION,
  callable: async (data) => {
    return { processed: true, count: data.length };
  }
});

const { result, state } = await step.execute([1, 2, 3]);
console.log(result); // { processed: true, count: 3 }
console.log(state.get('status')); // 'COMPLETED'
```

### `setWorkflow(workflow)`

Sets the workflow state reference. Called by the workflow before executing each step to provide access to the workflow state.

```javascript
setWorkflow(workflow: WorkflowState): void
```

**Parameters:**
- `workflow` (WorkflowState) - The workflow state object

**Example:**

```javascript
// Usually called by workflow, but can be set manually
const workflowState = new WorkflowState({ userId: 123 });
step.setWorkflow(workflowState);
```

### `run(data)`

Internal method that calls the step's callable function with proper context binding.

```javascript
async run(data?: any): Promise<any>
```

**Parameters:**
- `data` (any, optional) - Data to pass to callable

**Returns:**
- `Promise<any>` - Result from the callable function

**Throws:**
- `Error` if callable is not a function

### `setPreviousStep(step)`

Sets a reference to the previous step in the workflow.

```javascript
setPreviousStep(step: Step): void
```

**Parameters:**
- `step` (Step) - The previous step

**Example:**

```javascript
step2.setPreviousStep(step1);
```

### `getPreviousStep()`

Retrieves the previous step reference.

```javascript
getPreviousStep(): Step | null
```

**Returns:**
- `Step | null` - The previous step or null

**Example:**

```javascript
const prevStep = step.getPreviousStep();
if (prevStep) {
  console.log('Previous:', prevStep.name);
}
```

### `setState(state)`

Sets the step state from a State instance.

```javascript
setState(state: State): State
```

**Parameters:**
- `state` (State) - The State instance to set

**Returns:**
- `State` - The step state object

**Throws:**
- `Error` if state is not a State instance

**Example:**

```javascript
const newState = new State({ customProp: 'value' });
step.setState(newState);
```

### `toJSON(tabs)`

Serializes the step data to a JSON-compatible object.

```javascript
toJSON(tabs?: number): string
```

**Parameters:**
- `tabs` (number, optional) - Number of spaces for indentation (default: 2)

**Returns:**
- `string` - JSON string representation of the step

**Example:**

```javascript
const json = step.toJSON();
console.log(json);
```

### `logStep(message)`

Logs step status information unless logging is suppressed.

```javascript
logStep(message?: string): void
```

**Parameters:**
- `message` (string, optional) - Custom message to log

## State Properties

The step state includes the following properties accessible via `step.state.get(key)`:

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier (UUID) |
| `name` | `string` | Step name |
| `type` | `string` | Step type from StepTypes enum |
| `status` | `string` | Current status (see StepStatuses enum) |
| `result` | `any` | Result from callable execution |
| `error` | `Error` | Error object if step failed |
| `create_time` | `number` | Timestamp when created |
| `start_time` | `number` | Timestamp when execution started |
| `complete_time` | `number` | Timestamp when completed |
| `execution_time_ms` | `number` | Execution time in milliseconds |
| `retry_count` | `number` | Number of retry attempts made |
| `max_retries` | `number` | Maximum retries allowed |
| `retry_delay_ms` | `number` | Delay between retries |
| `timeout_ms` | `number` | Execution timeout limit |
| `suppress_log` | `boolean` | Whether logging is suppressed |
| `previous_step` | `Step` | Reference to previous step |

## Callable Function Context

The callable function receives a context object as its first parameter with `workflow` and `step` properties:

```javascript
const callable = async ({ workflow, step }, data) => {
  // Access workflow state
  workflow // WorkflowState instance
  
  // Access step properties
  step.state.get('name') // Step name
  step.state // Step state
  step.events // Step events
  
  // Perform work
  return result;
};
```

**Example:**

```javascript
const step = new Step({
  name: 'Access Workflow',
  type: StepTypes.ACTION,
  callable: async ({ workflow, step }, data) => {
    // Get workflow status
    const workflowStatus = state.get('status');
    
    // Get all workflow steps
    const allSteps = state.get('steps');
    
    // Get step name
    const stepName = step.state.get('name');
    
    // Set workflow flag
    if (condition) {
      state.set('should_skip', true);
    }
    
    return { workflowStatus, stepCount: allSteps.length, stepName };
  }
});
```

## Retry Behavior

Steps can automatically retry on failure:

```javascript
const step = new Step({
  name: 'API Call',
  type: StepTypes.ACTION,
  callable: async () => {
    const response = await fetch('/api/endpoint');
    if (!response.ok) throw new Error('API failed');
    return response.json();
  },
  max_retries: 3,          // Retry up to 3 times
  retry_delay_ms: 2000     // Wait 2 seconds between retries
});
```

## Timeout Behavior

Steps can have execution time limits:

```javascript
const step = new Step({
  name: 'Long Operation',
  type: StepTypes.ACTION,
  callable: async () => {
    // This will timeout if it takes longer than 5 seconds
    return await performLongOperation();
  },
  timeout_ms: 5000
});
```

## Events

See [StepEvent](./step-event.md) for all available events.

## Examples

### Basic Step

```javascript
const step = new Step({
  name: 'Calculate',
  type: StepTypes.ACTION,
  callable: async ({ workflow, step }, numbers) => {
    return numbers.reduce((sum, n) => sum + n, 0);
  }
});

const { result } = await step.execute([1, 2, 3, 4, 5]);
console.log(result); // 15
```

### Step with Workflow Access

```javascript
const step = new Step({
  name: 'Check Status',
  type: StepTypes.ACTION,
  callable: async ({ workflow, step }, data) => {
    // Access workflow state
    const userId = state.get('userId');
    const previousResults = state.get('output_data');
    
    // Conditional skip
    if (previousResults.length > 10) {
      state.set('should_skip', true);
    }
    
    return { userId, resultCount: previousResults.length };
  }
});
```

### Step with Retries and Timeout

```javascript
const step = new Step({
  name: 'Fetch External API',
  type: StepTypes.ACTION,
  callable: async ({ workflow, step }, url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },
  max_retries: 3,
  retry_delay_ms: 1000,
  timeout_ms: 5000
});

step.events.on('STEP_RETRY', (data) => {
  console.log(`Retry ${data.step.state.get('retry_count')}/${data.step.state.get('max_retries')}`);
});

await step.execute('https://api.example.com/data');
```

### Step with Event Tracking

```javascript
const step = new Step({
  name: 'Process Data',
  type: StepTypes.ACTION,
  callable: async ({ workflow, step }, data) => processData(data)
});

step.events.on('STEP_STARTED', () => {
  console.log('Started:', Date.now());
});

step.events.on('STEP_COMPLETED', (data) => {
  console.log('Completed in:', data.step.state.get('execution_time_ms'), 'ms');
  console.log('Result:', data.step.state.get('result'));
});

step.events.on('STEP_FAILED', (data) => {
  console.error('Failed:', data.step.state.get('error').message);
});

await step.execute(inputData);
```

## See Also

- [Core Concepts - Steps](../../core-concepts/steps.md)
- [State Class](./state.md)
- [StepEvent Class](./step-event.md)
- [Step Types](../step-types/index.md)
