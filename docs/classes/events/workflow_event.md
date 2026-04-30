# WorkflowEvent

Orchestrate and monitor high-level workflow transitions. `WorkflowEvent` extends the base `Event` class to manage triggers for workflow creation, execution, and modification.

Extends: [Event](event.md)

## Constructor

### `new WorkflowEvent()`

Initializes a new WorkflowEvent instance and registers all standard workflow triggers.

## Available Events

Manage the following high-level workflow triggers:
- `workflow_running` - Triggered when execution begins.
- `workflow_complete` - Triggered when all steps finish successfully.
- `workflow_failed` - Triggered when the workflow halts due to an error.
- `workflow_paused` - Triggered when execution is suspended.
- `workflow_resumed` - Triggered when a suspended workflow continues.
- `workflow_step_added` - Triggered when a step is dynamically added.

## Common Patterns

### Lifecycle Monitoring
```javascript
const workflowEvents = State.get('events.workflow');

workflowEvents.on('workflow_complete', (data) => {
  console.log(`Workflow "${data.name}" finished in ${data.timing.execution_time_ms}ms`);
});

workflowEvents.on('workflow_failed', (data) => {
  console.error(`Workflow "${data.name}" failed after ${data.timing.execution_time_ms}ms`);
});
```
