# WorkflowEvent

Manages workflow-specific events by extending the base Event class.

Extends: [Event](event.md)

## Constructor

### `new WorkflowEvent()`

Creates a new WorkflowEvent instance and registers all workflow events.

**Example (Node.js):**
```javascript
import { WorkflowEvent } from 'micro-flow';

const workflowEvents = new WorkflowEvent();

workflowEvents.on('workflow_complete', (data) => {
  console.log('Workflow completed:', data);
});
```

## Properties

- `event_names` (Object) - Workflow event name constants

All properties inherited from [Event](event.md)

## Methods

### `registerWorkflowEvents()`

Registers all workflow event names defined in the workflow_event_names enum.

## Available Events

The WorkflowEvent class automatically registers the following events:

- `workflow_cancelled` - Workflow was cancelled
- `workflow_complete` - Workflow completed successfully
- `workflow_created` - Workflow was created
- `workflow_errored` - Workflow encountered an error
- `workflow_failed` - Workflow execution failed
- `workflow_paused` - Workflow was paused
- `workflow_resumed` - Workflow was resumed from pause
- `workflow_running` - Workflow started executing
- `workflow_step_added` - Step was added to workflow
- `workflow_step_moved` - Step was moved to different position
- `workflow_step_removed` - Step was removed from workflow
- `workflow_step_shifted` - First step was removed
- `workflow_step_skipped` - Step was skipped during execution
- `workflow_steps_added` - Multiple steps were added
- `workflow_steps_cleared` - All steps were cleared

## Common Usage Patterns

### Workflow Lifecycle Monitor (Node.js)

```javascript
import { Workflow, Step, State } from 'micro-flow';

const workflowEvents = State.get('events.workflow');

// Track workflow lifecycle
const lifecycleTracker = {
  created: 0,
  running: 0,
  completed: 0,
  failed: 0
};

workflowEvents.on('workflow_created', () => {
  lifecycleTracker.created++;
  console.log('Workflows created:', lifecycleTracker.created);
});

workflowEvents.on('workflow_running', (data) => {
  lifecycleTracker.running++;
  console.log(`Workflow "${data.name}" started`);
});

workflowEvents.on('workflow_complete', (data) => {
  lifecycleTracker.completed++;
  console.log(`Workflow "${data.name}" completed in ${data.timing.execution_time_ms}ms`);
});

workflowEvents.on('workflow_failed', (data) => {
  lifecycleTracker.failed++;
  console.error(`Workflow "${data.name}" failed`);
});
```

### React Dashboard

```javascript
import { State } from './micro-flow.js';
import { useState, useEffect } from 'react';

function WorkflowDashboard() {
  const [activeWorkflows, setActiveWorkflows] = useState([]);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    const workflowEvents = State.get('events.workflow');

    const onRunning = (data) => {
      setActiveWorkflows(prev => [...prev, {
        id: data.id,
        name: data.name,
        status: 'running'
      }]);
    };

    const onComplete = (data) => {
      setActiveWorkflows(prev => 
        prev.filter(w => w.id !== data.id)
      );
      setCompletedCount(prev => prev + 1);
    };

    workflowEvents.on('workflow_running', onRunning);
    workflowEvents.on('workflow_complete', onComplete);

    return () => {
      workflowEvents.off('workflow_running', onRunning);
      workflowEvents.off('workflow_complete', onComplete);
    };
  }, []);

  return (
    <div>
      <h2>Active Workflows: {activeWorkflows.length}</h2>
      <h2>Completed: {completedCount}</h2>
      <ul>
        {activeWorkflows.map(w => (
          <li key={w.id}>{w.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Vue Progress Tracker

```vue
<template>
  <div class="workflow-tracker">
    <div v-for="workflow in workflows" :key="workflow.id">
      <h3>{{ workflow.name }}</h3>
      <progress :value="workflow.progress" max="100"></progress>
      <p>{{ workflow.status }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { State } from './micro-flow.js';

const workflows = ref([]);

onMounted(() => {
  const workflowEvents = State.get('events.workflow');

  workflowEvents.on('workflow_created', (data) => {
    workflows.value.push({
      id: data.id,
      name: data.name,
      status: 'Created',
      progress: 0
    });
  });

  workflowEvents.on('workflow_running', (data) => {
    const workflow = workflows.value.find(w => w.id === data.id);
    if (workflow) {
      workflow.status = 'Running';
      workflow.progress = 25;
    }
  });

  workflowEvents.on('workflow_complete', (data) => {
    const workflow = workflows.value.find(w => w.id === data.id);
    if (workflow) {
      workflow.status = 'Complete';
      workflow.progress = 100;
    }
  });
});
</script>
```

## See Also

- [Event](event.md) - Parent class
- [StepEvent](step_event.md) - Step-specific events
- [Workflow Event Names](../../enums/workflow_event_names.md) - Event name constants
- [Workflow](../workflow.md) - Emits these events
