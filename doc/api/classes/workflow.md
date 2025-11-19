# Workflow Class

The `Workflow` class is the main orchestration mechanism in Micro Flow. It manages the sequential execution of steps, handles state, emits lifecycle events, and provides flow control capabilities.

## Constructor

```javascript
new Workflow(options)
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `options.steps` | `Array<Step>` | No | `[]` | Initial array of steps to execute |
| `options.name` | `string` | No | `workflow_{uuid}` | Name for the workflow |
| `options.exit_on_failure` | `boolean` | No | `false` | Whether to stop execution when a step fails |
| `options.freeze_on_completion` | `boolean` | No | `true` | Whether to freeze state after completion |
| `options.sub_step_type_paths` | `Array<string>` | No | `[]` | Additional directory paths to scan for custom step classes. The built-in classes directory is always included. Paths are merged when `setWorkflow()` is called on each step. |

### Example

```javascript
import { Workflow, Step, StepTypes } from 'micro-flow';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const workflow = new Workflow({
  steps: [step1, step2, step3],
  name: 'Data Processing',
  exit_on_failure: false,
  freeze_on_completion: true,
  sub_step_type_paths: [join(__dirname, './custom-steps')]
});
```

## Properties

### `events`
- **Type:** `WorkflowEvent`
- **Description:** Event emitter for workflow lifecycle events
- **Read-only:** Yes

```javascript
workflow.events.on('WORKFLOW_STARTED', (data) => {
  console.log('Started:', data.workflow);
});
```

### `state`
- **Type:** `WorkflowState`
- **Description:** Workflow state instance containing all state data
- **Read-only:** No (but properties are managed through methods)

```javascript
const status = workflow.state.get('status');
const steps = workflow.state.get('steps');
```

## Methods

### `execute(initialState)`

Executes all steps in the workflow sequentially until completion or error. Passes workflow state to each step via `setWorkflow()` before execution.

```javascript
async execute(initialState?: WorkflowState): Promise<Object>
```

**Parameters:**
- `initialState` (WorkflowState, optional) - Initial state to merge before execution

**Returns:**
- `Promise<Object>` - A deep clone of the workflow state (via `getStateClone()`)

**Throws:**
- `Error` if initialState is provided but not an instance of WorkflowState, or if a step fails and exit_on_failure is true

**Example:**

```javascript
const workflow = new Workflow({ name: 'My Workflow' });
workflow.pushSteps([step1, step2, step3]);

// Execute
const result = await workflow.execute();
console.log('Completed in:', result.execution_time_ms, 'ms');

// Execute with initial state
const initialState = new WorkflowState({ userId: 123 });
const finalState = await workflow.execute(initialState);
```

### `pushStep(step)`

Adds a single step to the end of the workflow.

```javascript
pushStep(step: Step): void
```

**Parameters:**
- `step` (Step) - The step to add

**Emits:**
- `WORKFLOW_STEP_ADDED` event

**Example:**

```javascript
const step = new Step({
  name: 'Process Data',
  type: StepTypes.ACTION,
  callable: async () => processData()
});

workflow.pushStep(step);
```

### `pushSteps(steps)`

Adds multiple steps to the end of the workflow.

```javascript
pushSteps(steps: Array<Step>): void
```

**Parameters:**
- `steps` (Array<Step>) - Array of steps to add

**Emits:**
- `WORKFLOW_STEPS_ADDED` event

**Example:**

```javascript
workflow.pushSteps([step1, step2, step3]);
```

### `removeStep(index)`

Removes a step from the workflow at the specified index.

```javascript
removeStep(index: number): Array<Step>
```

**Parameters:**
- `index` (number) - The index of the step to remove

**Returns:**
- `Array<Step>` - Array containing the removed step

**Emits:**
- `WORKFLOW_STEP_REMOVED` event

**Example:**

```javascript
const removed = workflow.removeStep(0); // Remove first step
```

### `clearSteps()`

Removes all steps from the workflow.

```javascript
clearSteps(): void
```

**Emits:**
- `WORKFLOW_STEPS_CLEARED` event

**Example:**

```javascript
workflow.clearSteps();
```

### `getSteps()`

Retrieves all steps in the workflow.

```javascript
getSteps(): Array<Step>
```

**Returns:**
- `Array<Step>` - Array of all step objects

**Example:**

```javascript
const steps = workflow.getSteps();
console.log(`Workflow has ${steps.length} steps`);
```

### `moveStep(fromIndex, toIndex)`

Moves a step from one position to another in the workflow.

```javascript
moveStep(fromIndex: number, toIndex: number): void
```

**Parameters:**
- `fromIndex` (number) - The index of the step to move
- `toIndex` (number) - The destination index

**Emits:**
- `WORKFLOW_STEP_MOVED` event

**Example:**

```javascript
workflow.moveStep(0, 2); // Move first step to third position
```

### `shiftStep()`

Removes and returns the first step from the workflow.

```javascript
shiftStep(): Step | undefined
```

**Returns:**
- `Step | undefined` - The first step, or undefined if empty

**Emits:**
- `WORKFLOW_STEP_SHIFTED` event

**Example:**

```javascript
const firstStep = workflow.shiftStep();
```

### `pause()`

Pauses the workflow execution after the current step completes.

```javascript
pause(): void
```

**Emits:**
- `WORKFLOW_PAUSED` event

**Example:**

```javascript
workflow.pause();
// Workflow will pause after current step finishes
```

### `resume()`

Continues execution of a paused workflow from the current step index.

```javascript
async resume(): Promise<Workflow>
```

**Returns:**
- `Promise<Workflow>` - The workflow instance with final state

**Emits:**
- `WORKFLOW_RESUMED` event

**Example:**

```javascript
workflow.pause();
// ... later
await workflow.resume();
```

### `isEmpty()`

Checks if the workflow has no steps.

```javascript
isEmpty(): boolean
```

**Returns:**
- `boolean` - True if the workflow is empty, false otherwise

**Example:**

```javascript
if (workflow.isEmpty()) {
  console.log('No steps to execute');
}
```

### `setState(state)`

Sets the workflow state from a State instance. Preserves step instances and creates a steps_by_id mapping.

```javascript
setState(state: State): WorkflowState
```

**Parameters:**
- `state` (State) - The State instance to set

**Returns:**
- `WorkflowState` - The workflow state object

**Throws:**
- `Error` if state is not a State instance

**Example:**

```javascript
const newState = new WorkflowState({ customData: 'value' });
workflow.setState(newState);
```

### `toJSON(tabs)`

Serializes the workflow data to a JSON-compatible object, handling circular references.

```javascript
toJSON(tabs?: number): string
```

**Parameters:**
- `tabs` (number, optional) - Number of spaces for indentation (default: 2)

**Returns:**
- `string` - JSON string representation of the workflow

**Example:**

```javascript
const json = workflow.toJSON();
console.log(json);
```

### `incrementStepIndex()`

Increments the current step index by 1.

```javascript
incrementStepIndex(): void
```

### `decrementStepIndex()`

Decrements the current step index by 1.

```javascript
decrementStepIndex(): void
```

### `logWorkflow(message)`

Logs workflow status information to the console unless logging is suppressed.

```javascript
logWorkflow(message?: string): void
```

**Parameters:**
- `message` (string, optional) - Custom message to log

## State Properties

The workflow state includes the following properties accessible via `workflow.state.get(key)`:

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier (UUID) |
| `name` | `string` | Workflow name |
| `status` | `string` | Current status (see WorkflowStatuses enum) |
| `steps` | `Array<Step>` | Array of step objects |
| `current_step` | `Step` | Currently executing step |
| `current_step_index` | `number` | Index of current step |
| `output_data` | `Array` | Results from completed steps |
| `create_time` | `number` | Timestamp when created |
| `start_time` | `number` | Timestamp when execution started |
| `complete_time` | `number` | Timestamp when completed |
| `pause_time` | `number` | Timestamp when paused |
| `resume_time` | `number` | Timestamp when resumed |
| `cancel_time` | `number` | Timestamp when cancelled |
| `execution_time_ms` | `number` | Total execution time in milliseconds |
| `exit_on_failure` | `boolean` | Whether to exit on step failure |
| `freeze_on_completion` | `boolean` | Whether to freeze state on completion |
| `should_break` | `boolean` | Flag to break from loops |
| `should_continue` | `boolean` | Flag to continue loops |
| `should_skip` | `boolean` | Flag to skip next step |
| `should_pause` | `boolean` | Flag to pause after current step |

## Events

See [WorkflowEvent](./workflow-event.md) for all available events.

## Examples

### Basic Workflow

```javascript
const workflow = new Workflow({ name: 'Simple Flow' });

workflow.pushSteps([
  new Step({
    name: 'Step 1',
    type: StepTypes.ACTION,
    callable: async () => console.log('Step 1')
  }),
  new Step({
    name: 'Step 2',
    type: StepTypes.ACTION,
    callable: async () => console.log('Step 2')
  })
]);

await workflow.execute();
```

### With Event Tracking

```javascript
const workflow = new Workflow({ name: 'Tracked Flow' });

workflow.events.on('WORKFLOW_STARTED', () => {
  console.log('Started at:', Date.now());
});

workflow.events.on('WORKFLOW_COMPLETED', (data) => {
  console.log('Completed in:', data.workflow.state.get('execution_time_ms'), 'ms');
});

await workflow.execute();
```

### With Initial State

```javascript
const initialState = new State({
  userId: 123,
  data: []
});

await workflow.execute(initialState);
```

## See Also

- [Core Concepts - Workflows](../../core-concepts/workflows.md)
- [State Class](./state.md)
- [Step Class](./step.md)
- [WorkflowEvent Class](./workflow-event.md)
