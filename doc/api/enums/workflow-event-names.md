# workflow_event_names Enum

Defines the event names emitted by Workflow instances during their lifecycle.

## Values

| Constant | Value | Description |
|----------|-------|-------------|
| `WORKFLOW_CREATED` | `'WORKFLOW_CREATED'` | Workflow instance created |
| `WORKFLOW_STARTED` | `'WORKFLOW_STARTED'` | Workflow execution started |
| `WORKFLOW_COMPLETED` | `'WORKFLOW_COMPLETED'` | All steps completed successfully |
| `WORKFLOW_FAILED` | `'WORKFLOW_FAILED'` | Workflow failed due to step error |
| `WORKFLOW_PAUSED` | `'WORKFLOW_PAUSED'` | Workflow paused between steps |
| `WORKFLOW_RESUMED` | `'WORKFLOW_RESUMED'` | Workflow resumed after pause |
| `WORKFLOW_CANCELLED` | `'WORKFLOW_CANCELLED'` | Workflow execution cancelled |
| `WORKFLOW_STEP_ADDED` | `'WORKFLOW_STEP_ADDED'` | Single step added to workflow |
| `WORKFLOW_STEPS_ADDED` | `'WORKFLOW_STEPS_ADDED'` | Multiple steps added to workflow |
| `WORKFLOW_STEP_REMOVED` | `'WORKFLOW_STEP_REMOVED'` | Step removed from workflow |
| `WORKFLOW_STEPS_CLEARED` | `'WORKFLOW_STEPS_CLEARED'` | All steps removed from workflow |
| `WORKFLOW_STEP_MOVED` | `'WORKFLOW_STEP_MOVED'` | Step moved to different position |
| `WORKFLOW_STEP_SHIFTED` | `'WORKFLOW_STEP_SHIFTED'` | First step removed via shiftStep() |
| `WORKFLOW_STATE_CHANGED` | `'WORKFLOW_STATE_CHANGED'` | Workflow state modified |
| `WORKFLOW_FROZEN` | `'WORKFLOW_FROZEN'` | Workflow state frozen (immutable) |

## Import

```javascript
import { WorkflowEventNames } from 'micro-flow';
// or
import WorkflowEventNames from 'micro-flow/enums/workflow_event_names';
```

## Usage

```javascript
import { Workflow, WorkflowEventNames } from 'micro-flow';

const workflow = new Workflow({ name: 'My Workflow' });

// Listen to events
workflow.events.on(WorkflowEventNames.WORKFLOW_STARTED, (data) => {
  console.log('Workflow started:', data.workflow.name);
});

workflow.events.on(WorkflowEventNames.WORKFLOW_COMPLETED, (data) => {
  console.log('Workflow completed in:', data.workflow.state.get('execution_time_ms'), 'ms');
});

workflow.events.on(WorkflowEventNames.WORKFLOW_FAILED, (data) => {
  console.error('Workflow failed');
});

await workflow.execute();
```

## Event Descriptions

### Lifecycle Events

#### WORKFLOW_CREATED
- **When:** Workflow constructor is called
- **Data:** `{ workflow: Workflow }`

```javascript
workflow.events.on(WorkflowEventNames.WORKFLOW_CREATED, ({ workflow }) => {
  console.log(`Workflow "${workflow.state.get('name')}" created`);
});
```

#### WORKFLOW_STARTED
- **When:** execute() method begins
- **Data:** `{ workflow: Workflow }`

```javascript
workflow.events.on(WorkflowEventNames.WORKFLOW_STARTED, ({ workflow }) => {
  console.log('Started at:', workflow.state.get('start_time'));
});
```

#### WORKFLOW_COMPLETED
- **When:** All steps finish successfully
- **Data:** `{ workflow: Workflow }`

```javascript
workflow.events.on(WorkflowEventNames.WORKFLOW_COMPLETED, ({ workflow }) => {
  const duration = workflow.state.get('execution_time_ms');
  const results = workflow.state.get('output_data');
  console.log(`Completed in ${duration}ms with ${results.length} results`);
});
```

#### WORKFLOW_FAILED
- **When:** A step fails and exit_on_failure is true
- **Data:** `{ workflow: Workflow }`

```javascript
workflow.events.on(WorkflowEventNames.WORKFLOW_FAILED, ({ workflow }) => {
  const currentStep = workflow.state.get('current_step');
  console.error('Failed at step:', currentStep?.name);
});
```

#### WORKFLOW_PAUSED
- **When:** pause() called and current step completes
- **Data:** `{ workflow: Workflow }`

```javascript
workflow.events.on(WorkflowEventNames.WORKFLOW_PAUSED, ({ workflow }) => {
  const pausedAt = workflow.state.get('current_step_index');
  console.log(`Paused at step ${pausedAt}`);
});
```

#### WORKFLOW_RESUMED
- **When:** resume() called on paused workflow
- **Data:** `{ workflow: Workflow }`

```javascript
workflow.events.on(WorkflowEventNames.WORKFLOW_RESUMED, ({ workflow }) => {
  const resumeIndex = workflow.state.get('current_step_index');
  console.log(`Resumed from step ${resumeIndex}`);
});
```

#### WORKFLOW_CANCELLED
- **When:** Workflow execution is cancelled
- **Data:** `{ workflow: Workflow }`

```javascript
workflow.events.on(WorkflowEventNames.WORKFLOW_CANCELLED, ({ workflow }) => {
  console.log('Workflow cancelled');
});
```

### Step Management Events

#### WORKFLOW_STEP_ADDED
- **When:** pushStep() adds a single step
- **Data:** `{ workflow: Workflow, step: Step }`

```javascript
workflow.events.on(WorkflowEventNames.WORKFLOW_STEP_ADDED, ({ workflow, step }) => {
  console.log(`Step "${step.name}" added to workflow`);
});
```

#### WORKFLOW_STEPS_ADDED
- **When:** pushSteps() adds multiple steps
- **Data:** `{ workflow: Workflow, steps: Array<Step> }`

```javascript
workflow.events.on(WorkflowEventNames.WORKFLOW_STEPS_ADDED, ({ workflow, steps }) => {
  console.log(`${steps.length} steps added to workflow`);
});
```

#### WORKFLOW_STEP_REMOVED
- **When:** removeStep() removes a step
- **Data:** `{ workflow: Workflow, step: Step, index: number }`

```javascript
workflow.events.on(WorkflowEventNames.WORKFLOW_STEP_REMOVED, ({ workflow, step, index }) => {
  console.log(`Step "${step.name}" removed from index ${index}`);
});
```

#### WORKFLOW_STEPS_CLEARED
- **When:** clearSteps() removes all steps
- **Data:** `{ workflow: Workflow }`

```javascript
workflow.events.on(WorkflowEventNames.WORKFLOW_STEPS_CLEARED, ({ workflow }) => {
  console.log('All steps cleared from workflow');
});
```

#### WORKFLOW_STEP_MOVED
- **When:** moveStep() relocates a step
- **Data:** `{ workflow: Workflow, step: Step, fromIndex: number, toIndex: number }`

```javascript
workflow.events.on(WorkflowEventNames.WORKFLOW_STEP_MOVED, ({ step, fromIndex, toIndex }) => {
  console.log(`Step "${step.name}" moved from ${fromIndex} to ${toIndex}`);
});
```

#### WORKFLOW_STEP_SHIFTED
- **When:** shiftStep() removes first step
- **Data:** `{ workflow: Workflow, step: Step }`

```javascript
workflow.events.on(WorkflowEventNames.WORKFLOW_STEP_SHIFTED, ({ step }) => {
  console.log(`First step "${step.name}" shifted`);
});
```

### State Events

#### WORKFLOW_STATE_CHANGED
- **When:** Workflow state is modified
- **Data:** `{ workflow: Workflow, changes: Object }`

```javascript
workflow.events.on(WorkflowEventNames.WORKFLOW_STATE_CHANGED, ({ workflow, changes }) => {
  console.log('State changed:', changes);
});
```

#### WORKFLOW_FROZEN
- **When:** State is frozen after completion (freeze_on_completion: true)
- **Data:** `{ workflow: Workflow }`

```javascript
workflow.events.on(WorkflowEventNames.WORKFLOW_FROZEN, ({ workflow }) => {
  console.log('Workflow state is now immutable');
});
```

## Complete Example

```javascript
import { Workflow, Step, StepTypes, WorkflowEventNames } from 'micro-flow';

const workflow = new Workflow({ 
  name: 'Monitored Workflow',
  freeze_on_completion: true
});

// Lifecycle tracking
workflow.events.on(WorkflowEventNames.WORKFLOW_CREATED, () => {
  console.log('[CREATED] Workflow initialized');
});

workflow.events.on(WorkflowEventNames.WORKFLOW_STARTED, ({ workflow }) => {
  console.log('[STARTED] Beginning execution');
  console.log('  Steps:', workflow.getSteps().length);
});

workflow.events.on(WorkflowEventNames.WORKFLOW_COMPLETED, ({ workflow }) => {
  console.log('[COMPLETED]', {
    duration: workflow.state.get('execution_time_ms') + 'ms',
    results: workflow.state.get('output_data').length
  });
});

workflow.events.on(WorkflowEventNames.WORKFLOW_FAILED, ({ workflow }) => {
  console.error('[FAILED]', {
    step: workflow.state.get('current_step')?.name,
    index: workflow.state.get('current_step_index')
  });
});

workflow.events.on(WorkflowEventNames.WORKFLOW_FROZEN, () => {
  console.log('[FROZEN] State is now immutable');
});

// Step management tracking
workflow.events.on(WorkflowEventNames.WORKFLOW_STEP_ADDED, ({ step }) => {
  console.log(`[STEP_ADDED] "${step.name}"`);
});

workflow.events.on(WorkflowEventNames.WORKFLOW_STEPS_ADDED, ({ steps }) => {
  console.log(`[STEPS_ADDED] ${steps.length} steps`);
});

// Add steps
workflow.pushSteps([
  new Step({
    name: 'Step 1',
    type: StepTypes.ACTION,
    callable: async () => ({ result: 1 })
  }),
  new Step({
    name: 'Step 2',
    type: StepTypes.ACTION,
    callable: async () => ({ result: 2 })
  })
]);

await workflow.execute();
```

## Event Flow Example

```javascript
// Typical event sequence for successful workflow:
// 1. WORKFLOW_CREATED
// 2. WORKFLOW_STEP_ADDED (or WORKFLOW_STEPS_ADDED)
// 3. WORKFLOW_STARTED
// 4. (Step events fire for each step)
// 5. WORKFLOW_COMPLETED
// 6. WORKFLOW_FROZEN (if freeze_on_completion: true)

// With pause/resume:
// 1. WORKFLOW_CREATED
// 2. WORKFLOW_STARTED
// 3. (Some steps execute)
// 4. WORKFLOW_PAUSED
// 5. WORKFLOW_RESUMED
// 6. (Remaining steps execute)
// 7. WORKFLOW_COMPLETED
```

## See Also

- [WorkflowEvent Class](../classes/workflow-event.md)
- [Workflow Class](../classes/workflow.md)
- [step_event_names Enum](./step-event-names.md)
- [Core Concepts - Events](../../core-concepts/events.md)
