# WorkflowEvent Class

The `WorkflowEvent` class manages workflow-specific events by extending the base Event class. It automatically registers all workflow lifecycle event names.

## Constructor

```javascript
new WorkflowEvent()
```

### Example

```javascript
import { WorkflowEvent } from 'micro-flow';

const workflowEvents = new WorkflowEvent();
```

## Properties

### `event_names`
- **Type:** `Object` (from workflow_event_names enum)
- **Description:** All workflow event name constants

## Methods

### `registerWorkflowEvents()`

Registers all workflow event names defined in the workflow_event_names enum.

```javascript
registerWorkflowEvents(): void
```

**Example:**

```javascript
const workflowEvents = new WorkflowEvent();
// All workflow events are automatically registered in constructor
```

## Available Events

The WorkflowEvent class provides these events:

### Lifecycle Events

| Event | Description |
|-------|-------------|
| `WORKFLOW_CREATED` | Workflow instance created |
| `WORKFLOW_STARTED` | Workflow execution started |
| `WORKFLOW_COMPLETED` | All steps completed successfully |
| `WORKFLOW_FAILED` | Workflow failed due to step error |
| `WORKFLOW_PAUSED` | Workflow paused between steps |
| `WORKFLOW_RESUMED` | Workflow resumed after pause |
| `WORKFLOW_CANCELLED` | Workflow execution cancelled |
| `WORKFLOW_FROZEN` | Workflow state frozen (immutable) |

### Step Management Events

| Event | Description |
|-------|-------------|
| `WORKFLOW_STEP_ADDED` | Single step added |
| `WORKFLOW_STEPS_ADDED` | Multiple steps added |
| `WORKFLOW_STEP_REMOVED` | Step removed |
| `WORKFLOW_STEPS_CLEARED` | All steps cleared |
| `WORKFLOW_STEP_MOVED` | Step moved to different position |
| `WORKFLOW_STEP_SHIFTED` | First step removed |

### State Events

| Event | Description |
|-------|-------------|
| `WORKFLOW_STATE_CHANGED` | Workflow state modified |

## Usage Examples

### Basic Event Listening

```javascript
import { Workflow } from 'micro-flow';

const workflow = new Workflow({ name: 'My Workflow' });

workflow.events.on('WORKFLOW_STARTED', (data) => {
  console.log('Workflow started:', data.workflow.name);
});

workflow.events.on('WORKFLOW_COMPLETED', (data) => {
  const duration = data.workflow.state.get('execution_time_ms');
  console.log(`Workflow completed in ${duration}ms`);
});

await workflow.execute();
```

### Comprehensive Event Tracking

```javascript
const workflow = new Workflow({ 
  name: 'Tracked Workflow',
  freeze_on_completion: true
});

// Lifecycle tracking
workflow.events.on('WORKFLOW_CREATED', ({ workflow }) => {
  console.log('[CREATED]', workflow.state.get('name'));
});

workflow.events.on('WORKFLOW_STARTED', ({ workflow }) => {
  console.log('[STARTED]', {
    name: workflow.state.get('name'),
    steps: workflow.getSteps().length,
    time: new Date().toISOString()
  });
});

workflow.events.on('WORKFLOW_COMPLETED', ({ workflow }) => {
  console.log('[COMPLETED]', {
    name: workflow.state.get('name'),
    duration: workflow.state.get('execution_time_ms'),
    results: workflow.state.get('output_data').length
  });
});

workflow.events.on('WORKFLOW_FAILED', ({ workflow }) => {
  console.error('[FAILED]', {
    name: workflow.state.get('name'),
    failedStep: workflow.state.get('current_step')?.name,
    stepIndex: workflow.state.get('current_step_index')
  });
});

workflow.events.on('WORKFLOW_FROZEN', ({ workflow }) => {
  console.log('[FROZEN]', 'State is now immutable');
});

// Execute workflow
workflow.pushSteps([step1, step2, step3]);
await workflow.execute();
```

### Step Management Events

```javascript
const workflow = new Workflow({ name: 'Dynamic Workflow' });

workflow.events.on('WORKFLOW_STEP_ADDED', ({ workflow, step }) => {
  console.log(`Step added: "${step.name}"`);
  console.log(`Total steps: ${workflow.getSteps().length}`);
});

workflow.events.on('WORKFLOW_STEPS_ADDED', ({ workflow, steps }) => {
  console.log(`${steps.length} steps added`);
  steps.forEach(step => console.log(`  - ${step.name}`));
});

workflow.events.on('WORKFLOW_STEP_REMOVED', ({ workflow, step, index }) => {
  console.log(`Step "${step.name}" removed from index ${index}`);
});

workflow.events.on('WORKFLOW_STEPS_CLEARED', ({ workflow }) => {
  console.log('All steps cleared');
});

// Trigger events
workflow.pushStep(step1);
workflow.pushSteps([step2, step3]);
workflow.removeStep(0);
workflow.clearSteps();
```

### Pause and Resume Monitoring

```javascript
const workflow = new Workflow({ name: 'Pausable Workflow' });

workflow.events.on('WORKFLOW_PAUSED', ({ workflow }) => {
  const pausedAt = workflow.state.get('current_step_index');
  const pauseTime = workflow.state.get('pause_time');
  
  console.log('Workflow paused', {
    at: pausedAt,
    time: new Date(pauseTime).toISOString()
  });
});

workflow.events.on('WORKFLOW_RESUMED', ({ workflow }) => {
  const resumeTime = workflow.state.get('resume_time');
  const pauseTime = workflow.state.get('pause_time');
  const pauseDuration = resumeTime - pauseTime;
  
  console.log('Workflow resumed', {
    pausedFor: pauseDuration + 'ms'
  });
});

workflow.pushSteps([step1, step2, step3]);

// Pause after 1 second
setTimeout(() => workflow.pause(), 1000);

await workflow.execute();

// Resume later
await new Promise(resolve => setTimeout(resolve, 5000));
await workflow.resume();
```

### Event Data Structures

Different events emit different data structures:

```javascript
// Lifecycle events
workflow.events.on('WORKFLOW_COMPLETED', (data) => {
  // data = { workflow: Workflow }
  console.log(data.workflow.state.get('execution_time_ms'));
});

// Step added event
workflow.events.on('WORKFLOW_STEP_ADDED', (data) => {
  // data = { workflow: Workflow, step: Step }
  console.log(data.step.name);
});

// Steps added event
workflow.events.on('WORKFLOW_STEPS_ADDED', (data) => {
  // data = { workflow: Workflow, steps: Array<Step> }
  console.log(data.steps.length);
});

// Step removed event
workflow.events.on('WORKFLOW_STEP_REMOVED', (data) => {
  // data = { workflow: Workflow, step: Step, index: number }
  console.log(`Removed ${data.step.name} from index ${data.index}`);
});

// Step moved event
workflow.events.on('WORKFLOW_STEP_MOVED', (data) => {
  // data = { workflow: Workflow, step: Step, fromIndex: number, toIndex: number }
  console.log(`Moved from ${data.fromIndex} to ${data.toIndex}`);
});
```

### Progress Tracking

```javascript
const workflow = new Workflow({ name: 'Progress Workflow' });

workflow.events.on('WORKFLOW_STARTED', ({ workflow }) => {
  console.log('Progress: 0%');
});

// Track step completion via workflow state changes
let completedSteps = 0;
const totalSteps = workflow.getSteps().length;

workflow.events.on('WORKFLOW_STATE_CHANGED', ({ workflow }) => {
  const currentIndex = workflow.state.get('current_step_index');
  if (currentIndex > completedSteps) {
    completedSteps = currentIndex;
    const progress = Math.round((completedSteps / totalSteps) * 100);
    console.log(`Progress: ${progress}%`);
  }
});

workflow.events.on('WORKFLOW_COMPLETED', () => {
  console.log('Progress: 100%');
});

await workflow.execute();
```

### Error Handling and Logging

```javascript
const workflow = new Workflow({ 
  name: 'Production Workflow',
  exit_on_failure: true
});

workflow.events.on('WORKFLOW_FAILED', ({ workflow }) => {
  const failedStep = workflow.state.get('current_step');
  const error = failedStep?.state.get('error');
  
  // Log error details
  console.error('Workflow failed:', {
    workflow: workflow.state.get('name'),
    step: failedStep?.name,
    error: error?.message,
    stack: error?.stack,
    stepIndex: workflow.state.get('current_step_index'),
    completedSteps: workflow.state.get('output_data').length
  });
  
  // Send to monitoring service
  sendToMonitoring({
    type: 'workflow_failure',
    workflowId: workflow.state.get('id'),
    workflowName: workflow.state.get('name'),
    error: error?.message
  });
});

await workflow.execute().catch(() => {});
```

## Inheritance

```
EventTarget (Native)
└── Event (Micro Flow)
    └── WorkflowEvent (Micro Flow)
```

## See Also

- [Event Class](./event.md) - Base event class
- [Workflow Class](./workflow.md) - Uses WorkflowEvent for lifecycle events
- [workflow_event_names Enum](../enums/workflow-event-names.md) - All event constants
- [StepEvent Class](./step-event.md) - Step events
- [Core Concepts - Events](../../core-concepts/events.md)
