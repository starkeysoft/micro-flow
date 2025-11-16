# Workflows

Workflows are the primary orchestration mechanism in Micro Flow. They manage the sequential execution of steps, handle state, emit lifecycle events, and provide error handling capabilities.

## Overview

A Workflow instance manages an ordered collection of steps and executes them sequentially. Each workflow has its own state that is passed to steps during execution, allowing steps to access and modify workflow-level data.

## Creating a Workflow

```javascript
import { Workflow } from 'micro-flow';

const workflow = new Workflow({
  steps: [],                    // Array of step objects (optional)
  name: 'My Workflow',          // Workflow name (optional, auto-generated if not provided)
  exit_on_failure: true,        // Stop execution on step failure (default: true)
  freeze_on_completion: true,   // Freeze state after completion (default: true)
  sub_step_type_paths: []       // Additional directories for custom step classes (default: [])
});
```

## Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `steps` | `Array<Step>` | `[]` | Initial array of steps to execute |
| `name` | `string` | `workflow_{uuid}` | Name for the workflow |
| `exit_on_failure` | `boolean` | `true` | Whether to stop execution when a step fails |
| `freeze_on_completion` | `boolean` | `true` | Whether to freeze state after workflow completes |
| `sub_step_type_paths` | `Array<string>` | `[]` | Additional directory paths to scan for custom step classes. The built-in classes directory is always included. |

## Key Methods

### execute(initialState)

Executes all steps in the workflow sequentially until completion or error. Passes workflow state to each step via `setWorkflow()` before execution.

```javascript
const result = await workflow.execute();
console.log('Workflow completed:', result);

// With initial state
const initialState = new WorkflowState({ customData: 'value' });
const result = await workflow.execute(initialState);
```

**Parameters:**
- `initialState` (WorkflowState, optional) - Initial state to merge before execution

**Returns:**
- `Promise<Workflow>` - The workflow instance with final state

**Throws:**
- `Error` if workflow is empty or a step fails (when exit_on_failure is true)

### Managing Steps

#### pushStep(step)

Adds a single step to the end of the workflow.

```javascript
const step = new Step({
  name: 'Process Data',
  type: StepTypes.ACTION,
  callable: async () => { /* ... */ }
});

workflow.pushStep(step);
```

#### pushSteps(steps)

Adds multiple steps to the end of the workflow.

```javascript
workflow.pushSteps([step1, step2, step3]);
```

#### removeStep(index)

Removes a step at the specified index.

```javascript
const removed = workflow.removeStep(0); // Remove first step
```

#### clearSteps()

Removes all steps from the workflow.

```javascript
workflow.clearSteps();
```

#### getSteps()

Returns all steps in the workflow.

```javascript
const steps = workflow.getSteps();
```

#### moveStep(fromIndex, toIndex)

Moves a step from one position to another.

```javascript
workflow.moveStep(0, 2); // Move first step to third position
```

### Flow Control

#### pause()

Pauses the workflow execution after the current step completes.

```javascript
workflow.pause();
```

#### resume()

Continues execution of a paused workflow from the current step.

```javascript
await workflow.resume();
```

### State Management

#### setState(state)

Sets the workflow state from a State instance. Preserves step instances and creates a steps_by_id mapping.

```javascript
const newState = new WorkflowState({ /* ... */ });
workflow.setState(newState);
```

## Workflow Lifecycle

1. **Created** - Workflow instance is created
2. **Started** - Execution begins
3. **Running** - Steps are being executed
4. **Paused** (optional) - Execution is temporarily halted
5. **Resumed** (optional) - Execution continues after pause
6. **Completed** - All steps finished successfully
7. **Errored** - A step threw an error
8. **Cancelled** - Workflow was cancelled

## State Properties

The workflow state includes:

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
| `execution_time_ms` | `number` | Total execution time in milliseconds |
| `should_break` | `boolean` | Flag to break from loops |
| `should_continue` | `boolean` | Flag to continue loops |
| `should_skip` | `boolean` | Flag to skip next step |
| `should_pause` | `boolean` | Flag to pause after current step |

## Events

Workflows emit events throughout their lifecycle. See [Events Documentation](./events.md) for details.

```javascript
workflow.events.on('WORKFLOW_STARTED', (data) => {
  console.log('Workflow started:', data.workflow);
});

workflow.events.on('WORKFLOW_COMPLETED', (data) => {
  console.log('Workflow completed:', data.workflow);
});

workflow.events.on('WORKFLOW_ERRORED', (data) => {
  console.error('Workflow error:', data.error);
});
```

## Examples

### Basic Sequential Workflow

```javascript
import { Workflow, Step, StepTypes } from 'micro-flow';

const workflow = new Workflow({ name: 'Data Processing' });

workflow.pushSteps([
  new Step({
    name: 'Fetch',
    type: StepTypes.ACTION,
    callable: async () => await fetchData()
  }),
  new Step({
    name: 'Transform',
    type: StepTypes.ACTION,
    callable: async () => transformData()
  }),
  new Step({
    name: 'Save',
    type: StepTypes.ACTION,
    callable: async () => saveData()
  })
]);

await workflow.execute();
```

### Nested Workflows

Steps can contain workflows, allowing for powerful composition:

```javascript
const subWorkflow = new Workflow({
  name: 'Sub Process',
  steps: [subStep1, subStep2]
});

const mainWorkflow = new Workflow({ name: 'Main Process' });
mainWorkflow.pushStep(new Step({
  name: 'Run Sub Process',
  type: StepTypes.ACTION,
  callable: subWorkflow
}));

await mainWorkflow.execute();
```

### Error Handling

```javascript
const workflow = new Workflow({
  name: 'Resilient Workflow',
  exit_on_failure: false  // Continue even if a step fails
});

workflow.events.on('WORKFLOW_ERRORED', (data) => {
  console.error('Step failed:', data.error);
  // Handle error, send alert, etc.
});

await workflow.execute();
```

## Best Practices

1. **Name Your Workflows** - Use descriptive names for easier debugging
2. **Handle Errors** - Always listen for error events or handle exceptions
3. **Use State Wisely** - Keep state minimal and relevant
4. **Organize Steps** - Break complex workflows into sub-workflows
5. **Monitor Execution** - Use events to track workflow progress
6. **Test Thoroughly** - Test each step and the full workflow independently

## See Also

- [Steps](./steps.md)
- [State Management](./state-management.md)
- [Events](./events.md)
- [Error Handling](../advanced/error-handling.md)
