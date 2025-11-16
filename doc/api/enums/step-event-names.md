# step_event_names Enum

Defines the event names emitted by Step instances during their lifecycle.

## Values

| Constant | Value | Description |
|----------|-------|-------------|
| `STEP_CREATED` | `'STEP_CREATED'` | Step instance created |
| `STEP_STARTED` | `'STEP_STARTED'` | Step execution started |
| `STEP_COMPLETED` | `'STEP_COMPLETED'` | Step completed successfully |
| `STEP_FAILED` | `'STEP_FAILED'` | Step failed after retries |
| `STEP_RETRY` | `'STEP_RETRY'` | Step retrying after failure |
| `STEP_TIMEOUT` | `'STEP_TIMEOUT'` | Step exceeded timeout limit |
| `STEP_CANCELLED` | `'STEP_CANCELLED'` | Step execution cancelled |

## Import

```javascript
import { StepEventNames } from 'micro-flow';
// or
import StepEventNames from 'micro-flow/enums/step_event_names';
```

## Usage

```javascript
import { Step, StepEventNames } from 'micro-flow';

const step = new Step({
  name: 'My Step',
  type: StepTypes.ACTION,
  callable: async () => performAction()
});

// Listen to events
step.events.on(StepEventNames.STEP_STARTED, (data) => {
  console.log('Step started:', data.step.name);
});

step.events.on(StepEventNames.STEP_COMPLETED, (data) => {
  console.log('Step completed:', data.step.state.get('result'));
});

step.events.on(StepEventNames.STEP_FAILED, (data) => {
  console.error('Step failed:', data.step.state.get('error'));
});

await step.execute();
```

## Event Descriptions

### STEP_CREATED
- **When:** Step constructor is called
- **Data:** `{ step: Step }`
- **Use:** Track step initialization

```javascript
step.events.on(StepEventNames.STEP_CREATED, ({ step }) => {
  console.log(`Step "${step.name}" created at ${step.state.get('create_time')}`);
});
```

### STEP_STARTED
- **When:** execute() method begins
- **Data:** `{ step: Step }`
- **Use:** Track execution start, measure time

```javascript
step.events.on(StepEventNames.STEP_STARTED, ({ step }) => {
  console.log(`Step "${step.name}" started`);
});
```

### STEP_COMPLETED
- **When:** Callable returns successfully
- **Data:** `{ step: Step }`
- **Use:** Process results, trigger next actions

```javascript
step.events.on(StepEventNames.STEP_COMPLETED, ({ step }) => {
  const result = step.state.get('result');
  const duration = step.state.get('execution_time_ms');
  console.log(`Completed in ${duration}ms with result:`, result);
});
```

### STEP_FAILED
- **When:** Callable throws error (after all retries)
- **Data:** `{ step: Step }`
- **Use:** Error handling, logging, notifications

```javascript
step.events.on(StepEventNames.STEP_FAILED, ({ step }) => {
  const error = step.state.get('error');
  const retries = step.state.get('retry_count');
  console.error(`Failed after ${retries} retries:`, error.message);
});
```

### STEP_RETRY
- **When:** Step retrying after failure
- **Data:** `{ step: Step }`
- **Use:** Monitor retry attempts

```javascript
step.events.on(StepEventNames.STEP_RETRY, ({ step }) => {
  const current = step.state.get('retry_count');
  const max = step.state.get('max_retries');
  console.log(`Retry ${current}/${max}`);
});
```

### STEP_TIMEOUT
- **When:** Execution exceeds timeout_ms
- **Data:** `{ step: Step }`
- **Use:** Handle timeout situations

```javascript
step.events.on(StepEventNames.STEP_TIMEOUT, ({ step }) => {
  const timeout = step.state.get('timeout_ms');
  console.warn(`Step timed out after ${timeout}ms`);
});
```

### STEP_CANCELLED
- **When:** Step execution is cancelled
- **Data:** `{ step: Step }`
- **Use:** Handle cancellation cleanup

```javascript
step.events.on(StepEventNames.STEP_CANCELLED, ({ step }) => {
  console.log(`Step "${step.name}" was cancelled`);
});
```

## Complete Example

```javascript
import { Step, StepTypes, StepEventNames } from 'micro-flow';

const step = new Step({
  name: 'API Call',
  type: StepTypes.ACTION,
  callable: async () => {
    const response = await fetch('/api/data');
    return response.json();
  },
  max_retries: 3,
  retry_delay_ms: 1000,
  timeout_ms: 5000
});

// Comprehensive event tracking
step.events.on(StepEventNames.STEP_CREATED, ({ step }) => {
  console.log('[CREATED]', step.name);
});

step.events.on(StepEventNames.STEP_STARTED, ({ step }) => {
  console.log('[STARTED]', step.name, 'at', new Date().toISOString());
});

step.events.on(StepEventNames.STEP_RETRY, ({ step }) => {
  console.log('[RETRY]', `Attempt ${step.state.get('retry_count')} of ${step.state.get('max_retries')}`);
});

step.events.on(StepEventNames.STEP_COMPLETED, ({ step }) => {
  console.log('[COMPLETED]', {
    name: step.name,
    duration: step.state.get('execution_time_ms') + 'ms',
    result: step.state.get('result')
  });
});

step.events.on(StepEventNames.STEP_FAILED, ({ step }) => {
  console.error('[FAILED]', {
    name: step.name,
    error: step.state.get('error').message,
    retries: step.state.get('retry_count')
  });
});

step.events.on(StepEventNames.STEP_TIMEOUT, ({ step }) => {
  console.warn('[TIMEOUT]', `${step.name} exceeded ${step.state.get('timeout_ms')}ms`);
});

await step.execute();
```

## See Also

- [StepEvent Class](../classes/step-event.md)
- [Step Class](../classes/step.md)
- [workflow_event_names Enum](./workflow-event-names.md)
- [Core Concepts - Events](../../core-concepts/events.md)
