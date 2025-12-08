# Event

Event class for micro-flow. Provides a simple event emitter implementation for workflow steps and state changes.

This class is used for emitting and listening to events within workflows and steps. For broadcasting events across multiple workflows or listeners, see the [Broadcast](broadcast.md) class.

Extends: EventTarget

## Constructor

### `new Event()`

Creates a new Event instance.

**Example (Node.js):**
```javascript
import { Event } from 'micro-flow';

const eventEmitter = new Event();

eventEmitter.on('custom-event', (data) => {
  console.log('Event received:', data);
});

eventEmitter.emit('custom-event', { message: 'Hello' });
```

**Example (Browser):**
```javascript
import { Event } from './micro-flow.js';

const events = new Event();

events.on('user-action', (data) => {
  console.log('User performed action:', data);
});
```

## Properties

- `events` (Object) - Registered event instances
- `_listener_map` (Map) - Internal map of listener references

## Methods

### `registerEvents(event_names)`

Registers multiple events by creating Event instances for each event name.

**Parameters:**
- `event_names` (Object) - An object containing event name constants

**Example (Node.js):**
```javascript
import { Event } from 'micro-flow';

const events = new Event();
events.registerEvents({
  START: 'workflow_start',
  COMPLETE: 'workflow_complete',
  ERROR: 'workflow_error'
});
```

---

### `emit(event_name, data, bubbles, cancelable)`

Emits a custom event with optional data payload. This method maintains API compatibility with EventEmitter while using CustomEvent.

**Parameters:**
- `event_name` (string) - The name of the event to emit
- `data` (any, optional) - Optional data to pass with the event in the detail property
- `bubbles` (boolean, optional) - Whether the event should bubble up through the DOM (default: `false`)
- `cancelable` (boolean, optional) - Whether the event is cancelable (default: `true`)

**Returns:** boolean - True if the event was not cancelled, false if it was cancelled

**Example (Node.js - Workflow Events):**
```javascript
import { Workflow, Step, State } from 'micro-flow';

const workflow = new Workflow({
  name: 'monitored-workflow',
  steps: [
    new Step({
      name: 'task',
      callable: async () => {
        console.log('Executing task');
      }
    })
  ]
});

// Listen to workflow events
const workflowEvents = State.get('events.workflow');
workflowEvents.on('workflow_running', (data) => {
  console.log('Workflow started:', data);
});

workflowEvents.on('workflow_complete', (data) => {
  console.log('Workflow completed:', data);
});

await workflow.execute();
```

**Example (Browser with React - Progress Tracking):**
```javascript
import { Workflow, Step, State } from './micro-flow.js';
import { useState, useEffect } from 'react';

function WorkflowProgress() {
  const [progress, setProgress] = useState('');
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const stepEvents = State.get('events.step');
    
    const handleStepRunning = (data) => {
      setProgress(`Running: ${data.name}`);
    };
    
    const handleStepComplete = (data) => {
      setProgress(`Completed: ${data.name}`);
    };

    stepEvents.on('step_running', handleStepRunning);
    stepEvents.on('step_complete', handleStepComplete);

    return () => {
      stepEvents.off('step_running', handleStepRunning);
      stepEvents.off('step_complete', handleStepComplete);
    };
  }, []);

  return (
    <div>
      <p>Progress: {progress}</p>
    </div>
  );
}
```

---

### `onBroadcast(event_name, listener)`

Listen for broadcasts on a given event name (channel).

**Parameters:**
- `event_name` (string) - The event name/channel to listen for
- `listener` (Function) - Callback for broadcasted data

**Returns:** Broadcast - Returns the Broadcast instance for manual control

**Example (Node.js - Cross-Process Communication):**
```javascript
import { Event } from 'micro-flow';

const events = new Event();

events.onBroadcast('global-update', (data) => {
  console.log('Received broadcast:', data);
});
```

---

### `onAny(event_name, listener)`

Listen for both local and broadcast events.

**Parameters:**
- `event_name` (string) - The event name/channel to listen for
- `listener` (Function) - Callback for event data

**Returns:** Object - Returns `{ event: this, broadcast: Broadcast instance }`

**Example (Browser):**
```javascript
import { Event } from './micro-flow.js';

const events = new Event();

const handlers = events.onAny('data-update', (data) => {
  console.log('Data updated:', data);
  // Receives both local events and broadcasts
});
```

---

### `on(event_name, listener)`

Adds an event listener with EventEmitter-style API. Maintains compatibility with the original API while using addEventListener.

**Parameters:**
- `event_name` (string) - The name of the event to listen for
- `listener` (Function) - The callback function to execute when the event fires

**Returns:** Event - Returns this for chaining

**Example (Node.js - Error Handling):**
```javascript
import { Workflow, Step, State } from 'micro-flow';

const workflow = new Workflow({
  name: 'error-handling',
  exit_on_error: false,
  steps: [
    new Step({
      name: 'risky-task',
      callable: async () => {
        throw new Error('Something went wrong');
      }
    })
  ]
});

const stepEvents = State.get('events.step');
stepEvents.on('step_failed', (data) => {
  console.error('Step failed:', data.name);
  console.error('Errors:', data.errors);
  // Send to error tracking service
  sendToSentry(data);
});

await workflow.execute();
```

**Example (Browser with Vue - Real-time Updates):**
```vue
<template>
  <div>
    <ul>
      <li v-for="event in eventLog" :key="event.id">
        {{ event.timestamp }}: {{ event.message }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { State } from './micro-flow.js';

const eventLog = ref([]);

let handlers = [];

onMounted(() => {
  const workflowEvents = State.get('events.workflow');
  
  const onRunning = (data) => {
    eventLog.value.push({
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      message: `Workflow "${data.name}" started`
    });
  };
  
  const onComplete = (data) => {
    eventLog.value.push({
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      message: `Workflow "${data.name}" completed`
    });
  };

  workflowEvents.on('workflow_running', onRunning);
  workflowEvents.on('workflow_complete', onComplete);
  
  handlers = [
    { event: 'workflow_running', handler: onRunning },
    { event: 'workflow_complete', handler: onComplete }
  ];
});

onUnmounted(() => {
  const workflowEvents = State.get('events.workflow');
  handlers.forEach(({ event, handler }) => {
    workflowEvents.off(event, handler);
  });
});
</script>
```

---

### `once(event_name, listener)`

Adds a one-time event listener with EventEmitter-style API.

**Parameters:**
- `event_name` (string) - The name of the event to listen for
- `listener` (Function) - The callback function to execute when the event fires

**Returns:** Event - Returns this for chaining

**Example (Node.js):**
```javascript
import { State } from 'micro-flow';

const workflowEvents = State.get('events.workflow');

workflowEvents.once('workflow_complete', (data) => {
  console.log('First workflow completed:', data.name);
  // This handler will only run once
});
```

---

### `off(event_name, listener)`

Removes an event listener with EventEmitter-style API.

**Parameters:**
- `event_name` (string) - The name of the event
- `listener` (Function) - The callback function to remove

**Returns:** Event - Returns this for chaining

**Example (Browser):**
```javascript
const events = State.get('events.step');

const handler = (data) => {
  console.log('Step completed:', data);
};

events.on('step_complete', handler);

// Later, remove the listener
events.off('step_complete', handler);
```

---

### `removeListener(event_name, listener)`

Alias for off() to maintain EventEmitter API compatibility.

**Parameters:**
- `event_name` (string) - The name of the event
- `listener` (Function) - The callback function to remove

**Returns:** Event - Returns this for chaining

## Common Patterns

### Centralized Event Logger (Node.js)

```javascript
import { State } from 'micro-flow';
import fs from 'fs/promises';

class EventLogger {
  constructor(logFile) {
    this.logFile = logFile;
    this.setupListeners();
  }

  setupListeners() {
    const workflowEvents = State.get('events.workflow');
    const stepEvents = State.get('events.step');

    // Log all workflow events
    workflowEvents.on('workflow_running', (data) => this.log('WORKFLOW_START', data));
    workflowEvents.on('workflow_complete', (data) => this.log('WORKFLOW_COMPLETE', data));
    workflowEvents.on('workflow_failed', (data) => this.log('WORKFLOW_FAILED', data));

    // Log all step events
    stepEvents.on('step_running', (data) => this.log('STEP_START', data));
    stepEvents.on('step_complete', (data) => this.log('STEP_COMPLETE', data));
    stepEvents.on('step_failed', (data) => this.log('STEP_FAILED', data));
  }

  async log(eventType, data) {
    const entry = {
      timestamp: new Date().toISOString(),
      type: eventType,
      name: data.name,
      id: data.id,
      status: data.status
    };
    
    await fs.appendFile(this.logFile, JSON.stringify(entry) + '\n');
  }
}

const logger = new EventLogger('./workflow.log');
```

### Performance Monitor (Browser with React)

```javascript
import { State } from './micro-flow.js';
import { useState, useEffect } from 'react';

function PerformanceMonitor() {
  const [metrics, setMetrics] = useState({});

  useEffect(() => {
    const stepEvents = State.get('events.step');
    const timings = {};

    const onStepRunning = (data) => {
      timings[data.id] = { start: Date.now(), name: data.name };
    };

    const onStepComplete = (data) => {
      if (timings[data.id]) {
        const duration = Date.now() - timings[data.id].start;
        setMetrics(prev => ({
          ...prev,
          [data.name]: duration
        }));
      }
    };

    stepEvents.on('step_running', onStepRunning);
    stepEvents.on('step_complete', onStepComplete);

    return () => {
      stepEvents.off('step_running', onStepRunning);
      stepEvents.off('step_complete', onStepComplete);
    };
  }, []);

  return (
    <div>
      <h3>Step Performance</h3>
      {Object.entries(metrics).map(([name, duration]) => (
        <div key={name}>
          {name}: {duration}ms
        </div>
      ))}
    </div>
  );
}
```

## See Also

- [WorkflowEvent](workflow_event.md) - Workflow-specific events
- [StepEvent](step_event.md) - Step-specific events
- [Broadcast](broadcast.md) - Cross-context event broadcasting
- [Workflow Event Names](../../enums/workflow_event_names.md) - Available workflow events
- [Step Event Names](../../enums/step_event_names.md) - Available step events
