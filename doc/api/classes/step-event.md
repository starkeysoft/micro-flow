# StepEvent Class

The `StepEvent` class manages step-specific events by extending the base Event class. It automatically registers all step lifecycle event names.

## Constructor

```javascript
new StepEvent()
```

### Example

```javascript
import { StepEvent } from 'micro-flow';

const stepEvents = new StepEvent();
```

## Properties

### `event_names`
- **Type:** `Object` (from step_event_names enum)
- **Description:** All step event name constants

## Methods

### `registerStepEvents()`

Registers all step event names defined in the step_event_names enum.

```javascript
registerStepEvents(): void
```

**Example:**

```javascript
const stepEvents = new StepEvent();
// All step events are automatically registered in constructor
```

## Available Events

The StepEvent class provides these events:

| Event | Description |
|-------|-------------|
| `STEP_CREATED` | Step instance created |
| `STEP_STARTED` | Step execution started |
| `STEP_COMPLETED` | Step completed successfully |
| `STEP_FAILED` | Step failed after retries |
| `STEP_RETRY` | Step retrying after failure |
| `STEP_TIMEOUT` | Step exceeded timeout limit |
| `STEP_CANCELLED` | Step execution cancelled |

## Usage Examples

### Basic Event Listening

```javascript
import { Step, StepTypes } from 'micro-flow';

const step = new Step({
  name: 'My Step',
  type: StepTypes.ACTION,
  callable: async () => performWork()
});

// Listen to step events
step.events.on('STEP_STARTED', (data) => {
  console.log('Step started:', data.step.name);
});

step.events.on('STEP_COMPLETED', (data) => {
  console.log('Step completed:', data.step.state.get('result'));
});

await step.execute();
```

### Comprehensive Event Tracking

```javascript
const step = new Step({
  name: 'Tracked Step',
  type: StepTypes.ACTION,
  callable: async () => fetchData(),
  max_retries: 3,
  timeout_ms: 5000
});

// Track all lifecycle events
step.events.on('STEP_CREATED', ({ step }) => {
  console.log('[CREATED]', step.name);
});

step.events.on('STEP_STARTED', ({ step }) => {
  console.log('[STARTED]', step.name);
});

step.events.on('STEP_RETRY', ({ step }) => {
  const retry = step.state.get('retry_count');
  const max = step.state.get('max_retries');
  console.log('[RETRY]', `${retry}/${max}`);
});

step.events.on('STEP_COMPLETED', ({ step }) => {
  console.log('[COMPLETED]', {
    duration: step.state.get('execution_time_ms'),
    result: step.state.get('result')
  });
});

step.events.on('STEP_FAILED', ({ step }) => {
  console.error('[FAILED]', step.state.get('error').message);
});

step.events.on('STEP_TIMEOUT', ({ step }) => {
  console.warn('[TIMEOUT]', step.state.get('timeout_ms'));
});

await step.execute();
```

### Event Data Structure

All step events emit data with this structure:

```javascript
{
  step: Step // The step instance
}
```

Example:

```javascript
step.events.on('STEP_COMPLETED', (data) => {
  // Access the step instance
  const stepName = data.step.name;
  const stepStatus = data.step.state.get('status');
  const stepResult = data.step.state.get('result');
  const duration = data.step.state.get('execution_time_ms');
  
  console.log(`${stepName} completed in ${duration}ms`);
});
```

### Error Handling

```javascript
const step = new Step({
  name: 'Failing Step',
  type: StepTypes.ACTION,
  callable: async () => {
    throw new Error('Intentional error');
  },
  max_retries: 2
});

step.events.on('STEP_FAILED', ({ step }) => {
  const error = step.state.get('error');
  const retries = step.state.get('retry_count');
  
  console.error(`Step "${step.name}" failed after ${retries} retries`);
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  
  // Send to error tracking service
  trackError({
    stepName: step.name,
    error: error.message,
    retries: retries
  });
});

await step.execute().catch(() => {});
```

### Performance Monitoring

```javascript
const step = new Step({
  name: 'API Call',
  type: StepTypes.ACTION,
  callable: async () => await fetch('/api/data').then(r => r.json())
});

let startTime;

step.events.on('STEP_STARTED', () => {
  startTime = Date.now();
});

step.events.on('STEP_COMPLETED', ({ step }) => {
  const duration = Date.now() - startTime;
  const result = step.state.get('result');
  
  // Log performance metrics
  console.log('Performance:', {
    step: step.name,
    duration: duration,
    recordCount: result?.length || 0
  });
  
  // Alert if slow
  if (duration > 3000) {
    console.warn(`Slow step detected: ${step.name} took ${duration}ms`);
  }
});

await step.execute();
```

### One-Time Event Listeners

```javascript
const step = new Step({
  name: 'One Time',
  type: StepTypes.ACTION,
  callable: async () => 'result'
});

// Listen once
step.events.once('STEP_COMPLETED', ({ step }) => {
  console.log('Completed once:', step.name);
});

await step.execute();
await step.execute(); // Listener won't fire again
```

## Inheritance

```
EventTarget (Native)
└── Event (Micro Flow)
    └── StepEvent (Micro Flow)
```

## See Also

- [Event Class](./event.md) - Base event class
- [Step Class](./step.md) - Uses StepEvent for lifecycle events
- [step_event_names Enum](../enums/step-event-names.md) - All event constants
- [WorkflowEvent Class](./workflow-event.md) - Workflow events
- [Core Concepts - Events](../../core-concepts/events.md)
