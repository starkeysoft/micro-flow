
# Events

Micro Flow provides a comprehensive event system that allows you to monitor and react to workflow and step lifecycle changes. The event system is compatible with both browser (EventTarget) and Node.js (EventEmitter) patterns.

## Global Event Propagation via Event

The `Event` class in Micro Flow not only handles local workflow and step events, but also implements global (broadcast) event propagation internally. When you emit an event using the `Event` class, it automatically broadcasts the event to all listeners across contexts (such as browser tabs, windows, workers, or Node.js processes) using the built-in broadcast mechanism.

This means you do not need to use a separate `Broadcast` class for most use cases—simply use the `Event` class and its API for both local and global events.

### Example: Local and Broadcast Events with Event

```javascript
import Event from 'micro-flow/src/classes/event.js';

const events = new Event();

// Listen for local events
events.on('COMPLETE', (data) => {
  console.log('Local event received:', data);
});

// Listen for broadcasted events (from other contexts)
events.onBroadcast('COMPLETE', (data) => {
  console.log('Broadcast event received:', data);
});

// Emit an event (will trigger both local and broadcast listeners)
events.emit('COMPLETE', { time: Date.now() });
```

You can also use `onAny` to listen for both local and broadcast events with a single call:

```javascript
events.onAny('COMPLETE', (data) => {
  console.log('Received (local or broadcast):', data);
});
```

See [API Reference - Event](../api/classes/event.md) for more details on broadcast integration.

## Overview

The event system is built on the `Event` class, which extends `EventTarget` and provides both modern (`addEventListener`) and classic (`on/off`) APIs. Both workflows and steps emit events throughout their lifecycle.

## Event Architecture

### Event Class

The base `Event` class provides cross-platform event handling:

```javascript
import { Event } from 'micro-flow';

const events = new Event();

// EventTarget style (browser-compatible)
events.addEventListener('myEvent', (event) => {
  console.log(event.detail);
});

// EventEmitter style (Node.js-compatible)
events.on('myEvent', (data) => {
  console.log(data);
});

// Emit events
events.emit('myEvent', { key: 'value' });
```

### Compatibility

The event system works in both environments:

**Browser:**
```javascript
// Uses native EventTarget
workflow.events.addEventListener('WORKFLOW_STARTED', (event) => {
  console.log('Started:', event.detail.workflow);
});
```

**Node.js:**
```javascript
// EventEmitter-style API
workflow.events.on('WORKFLOW_STARTED', (data) => {
  console.log('Started:', data.workflow);
});
```

## Workflow Events

Workflows emit events through the `WorkflowEvent` class, which extends `Event`.

### Available Workflow Events

| Event Name | When Emitted | Data |
|------------|--------------|------|
| `WORKFLOW_CREATED` | When workflow is instantiated | `{ workflow }` |
| `WORKFLOW_STARTED` | When execution begins | `{ workflow }` |
| `WORKFLOW_COMPLETED` | When all steps finish successfully | `{ workflow }` |
| `WORKFLOW_ERRORED` | When a step throws an error | `{ workflow, error }` |
| `WORKFLOW_FAILED` | When workflow fails | `{ workflow }` |
| `WORKFLOW_PAUSED` | When workflow is paused | `{ workflow }` |
| `WORKFLOW_RESUMED` | When workflow resumes | `{ workflow }` |
| `WORKFLOW_CANCELLED` | When workflow is cancelled | `{ workflow }` |
| `WORKFLOW_STEP_ADDED` | When a step is added | `{ workflow, step }` |
| `WORKFLOW_STEPS_ADDED` | When multiple steps are added | `{ workflow, steps }` |
| `WORKFLOW_STEP_REMOVED` | When a step is removed | `{ workflow, removedStep }` |
| `WORKFLOW_STEP_MOVED` | When a step is moved | `{ workflow, movedStep }` |
| `WORKFLOW_STEP_SHIFTED` | When first step is removed | `{ workflow, shiftedStep }` |
| `WORKFLOW_STEP_SKIPPED` | When a step is skipped | `{ workflow }` |
| `WORKFLOW_STEPS_CLEARED` | When all steps are cleared | `{ workflow }` |

### Listening to Workflow Events

```javascript
const workflow = new Workflow({ name: 'My Workflow' });

// Using on() method
workflow.events.on('WORKFLOW_STARTED', (data) => {
  console.log(`Workflow "${data.workflow.state.get('name')}" started`);
});

workflow.events.on('WORKFLOW_COMPLETED', (data) => {
  const duration = data.workflow.state.get('execution_time_ms');
  console.log(`Completed in ${duration}ms`);
});

workflow.events.on('WORKFLOW_ERRORED', (data) => {
  console.error('Error:', data.error.message);
});

// Using addEventListener() method
workflow.events.addEventListener('WORKFLOW_PAUSED', (event) => {
  console.log('Paused at step:', event.detail.workflow.state.get('current_step_index'));
});
```

### Event Names Enum

Access event names through the enum:

```javascript
import { WorkflowEventNames } from 'micro-flow';

workflow.events.on(WorkflowEventNames.WORKFLOW_STARTED, (data) => {
  // ...
});

// Or directly from the events object
workflow.events.on(workflow.events.event_names.WORKFLOW_STARTED, (data) => {
  // ...
});
```

## Step Events

Steps emit events through the `StepEvent` class.

### Available Step Events

| Event Name | When Emitted | Data |
|------------|--------------|------|
| `STEP_WAITING` | Step is waiting to execute | `{ step }` |
| `STEP_PENDING` | Step is pending (queued after delay) | `{ step }` |
| `STEP_RUNNING` | Step execution begins | `{ step }` |
| `STEP_COMPLETED` | Step finishes successfully | `{ step, result }` |
| `STEP_FAILED` | Step throws an error | `{ step, error }` |
| `DELAY_STEP_ABSOLUTE_COMPLETE` | Absolute delay completes | `{ step, timestamp }` |
| `DELAY_STEP_RELATIVE_COMPLETE` | Relative delay completes | `{ step, duration, completed_at }` |

### Listening to Step Events

```javascript
const step = new Step({
  name: 'Process Data',
  type: StepTypes.ACTION,
  callable: async () => { /* ... */ }
});

step.events.on('STEP_RUNNING', (data) => {
  console.log(`Step "${data.step.state.get('name')}" is running`);
});

step.events.on('STEP_COMPLETED', (data) => {
  console.log('Result:', data.result);
  console.log('Duration:', data.step.state.get('execution_time_ms'));
});

step.events.on('STEP_FAILED', (data) => {
  console.error('Step failed:', data.error);
});
```

### Event Names Enum

```javascript
import { StepEventNames } from 'micro-flow';

step.events.on(StepEventNames.STEP_COMPLETED, (data) => {
  // ...
});

// Or from the events object
step.events.on(step.events.event_names.STEP_COMPLETED, (data) => {
  // ...
});
```

## Event Methods

### on(event_name, listener)

Adds an event listener (EventEmitter-style).

```javascript
const handler = (data) => {
  console.log('Event fired:', data);
};

events.on('myEvent', handler);
```

**Parameters:**
- `event_name` (string) - Event name to listen for
- `listener` (Function) - Callback function

**Returns:**
- Event instance (for chaining)

### once(event_name, listener)

Adds a one-time event listener.

```javascript
events.once('WORKFLOW_COMPLETED', (data) => {
  console.log('This will only fire once');
});
```

**Parameters:**
- `event_name` (string) - Event name to listen for
- `listener` (Function) - Callback function

**Returns:**
- Event instance (for chaining)

### off(event_name, listener)

Removes an event listener.

```javascript
const handler = (data) => console.log(data);

events.on('myEvent', handler);
events.off('myEvent', handler); // Remove listener
```

**Parameters:**
- `event_name` (string) - Event name
- `listener` (Function) - Callback function to remove

**Returns:**
- Event instance (for chaining)

### emit(event_name, data, bubbles, cancelable)

Emits an event with optional data.

```javascript
events.emit('myEvent', { key: 'value' });
```

**Parameters:**
- `event_name` (string) - Event name to emit
- `data` (any, optional) - Data to pass with the event
- `bubbles` (boolean, optional) - Whether event should bubble (default: `false`)
- `cancelable` (boolean, optional) - Whether event is cancelable (default: `true`)

**Returns:**
- `boolean` - True if event was not cancelled

### addEventListener(event_name, listener, options)

Adds an event listener (EventTarget-style).

```javascript
events.addEventListener('myEvent', (event) => {
  console.log(event.detail); // Data is in event.detail
});
```

**Parameters:**
- `event_name` (string) - Event name to listen for
- `listener` (Function) - Callback function (receives Event object)
- `options` (Object, optional) - Options like `{ once: true }`

### removeEventListener(event_name, listener)

Removes an event listener (EventTarget-style).

```javascript
const handler = (event) => console.log(event.detail);

events.addEventListener('myEvent', handler);
events.removeEventListener('myEvent', handler);
```

## Examples

### Monitoring Workflow Progress

```javascript
const workflow = new Workflow({ name: 'Data Pipeline' });

let stepCount = 0;

workflow.events.on('STEP_RUNNING', () => {
  stepCount++;
  console.log(`Executing step ${stepCount}`);
});

workflow.events.on('WORKFLOW_COMPLETED', (data) => {
  console.log(`All ${stepCount} steps completed`);
});

workflow.pushSteps([step1, step2, step3]);
await workflow.execute();
```

### Error Tracking

```javascript
const errorLog = [];

workflow.events.on('WORKFLOW_ERRORED', (data) => {
  errorLog.push({
    timestamp: Date.now(),
    error: data.error.message,
    step: data.workflow.state.get('current_step')?.state.get('name')
  });
});

step.events.on('STEP_FAILED', (data) => {
  console.error('Step failed:', {
    step: data.step.state.get('name'),
    error: data.error.message
  });
});
```

### Performance Monitoring

```javascript
workflow.events.on('WORKFLOW_STARTED', (data) => {
  console.log('Started at:', data.workflow.state.get('start_time'));
});

workflow.events.on('WORKFLOW_COMPLETED', (data) => {
  const duration = data.workflow.state.get('execution_time_ms');
  console.log(`Workflow took ${duration}ms`);
});

step.events.on('STEP_COMPLETED', (data) => {
  const stepDuration = data.step.state.get('execution_time_ms');
  console.log(`Step took ${stepDuration}ms`);
});
```

### Logging with Both APIs

```javascript
// EventEmitter style (Node.js)
workflow.events.on('WORKFLOW_STARTED', (data) => {
  console.log('Started (on):', data.workflow.state.get('name'));
});

// EventTarget style (Browser)
workflow.events.addEventListener('WORKFLOW_STARTED', (event) => {
  console.log('Started (addEventListener):', event.detail.workflow.state.get('name'));
});
```

### React Integration

```javascript
import { useEffect, useState } from 'react';
import { Workflow } from 'micro-flow';

function WorkflowComponent() {
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const workflow = new Workflow({ name: 'User Process' });
    
    workflow.events.on('WORKFLOW_STARTED', () => {
      setStatus('running');
    });
    
    workflow.events.on('STEP_COMPLETED', (data) => {
      const currentIndex = data.step.state.get('current_step_index');
      const totalSteps = data.step.state.get('steps').length;
      setProgress((currentIndex / totalSteps) * 100);
    });
    
    workflow.events.on('WORKFLOW_COMPLETED', () => {
      setStatus('completed');
      setProgress(100);
    });
    
    // Cleanup
    return () => {
      // Remove listeners if needed
    };
  }, []);
  
  return (
    <div>
      <p>Status: {status}</p>
      <progress value={progress} max="100" />
    </div>
  );
}
```

### Browser Event Handling

```javascript
// In browser environment
const workflow = new Workflow({ name: 'UI Workflow' });

// Using addEventListener (more familiar in browser)
workflow.events.addEventListener('WORKFLOW_COMPLETED', (event) => {
  // Show notification
  new Notification('Workflow Complete', {
    body: `${event.detail.workflow.state.get('name')} finished`
  });
});

// Can also bubble events up the DOM if needed
workflow.events.emit('CUSTOM_EVENT', { data: 'value' }, true); // bubbles = true
```

## Best Practices

1. **Clean Up Listeners** - Remove event listeners when they're no longer needed
3. **Handle Errors** - Always listen for error events to catch failures
4. **Log Strategically** - Use events for logging without cluttering callable code
5. **Monitor Performance** - Track execution times using lifecycle events
6. **Avoid Memory Leaks** - Clean up listeners in long-running applications
7. **Use Once When Appropriate** - Use `once()` for one-time notifications


## See Also

- [Workflows](./workflows.md)
- [Steps](./steps.md)
- [Event Listeners](../advanced/event-listeners.md)
- [API Reference - Event](../api/classes/event.md)
- [API Reference - Broadcast](../api/classes/broadcast.md)
