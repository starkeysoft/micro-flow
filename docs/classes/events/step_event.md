# StepEvent

Track individual step progress and execution results. `StepEvent` provides fine-grained observability into the lifecycle of every unit of work within a workflow.

Extends: [Event](event.md)

## Constructor

### `new StepEvent()`

Initializes a new StepEvent instance and registers all standard step lifecycle triggers.

## Available Events

Monitor the following step lifecycle triggers:
- `step_running` - Triggered when a step begins execution.
- `step_complete` - Triggered when a step resolves successfully.
- `step_failed` - Triggered when a step encounters an error.
- `step_retrying` - Triggered when the engine attempts an automatic retry.
- `step_waiting` - Triggered when a step enters a waiting or delayed state.

## Common Patterns

### Execution Logging
```javascript
const stepEvents = State.get('events.step');

stepEvents.on('step_running', (data) => {
  console.log(`▶ Starting: ${data.name}`);
});

stepEvents.on('step_complete', (data) => {
  console.log(`✓ Completed: ${data.name} in ${data.timing.execution_time_ms}ms`);
});
```
