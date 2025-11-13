# WorkflowEvent

**Manages workflow-specific events by extending the base Event class.**

## Overview

The `WorkflowEvent` class provides event management for workflow lifecycle events. It automatically registers all workflow-related event names.

## Class Definition

```javascript
class WorkflowEvent extends Event
```

**Extends:** [Event](Event.md)  
**Location:** `src/classes/workflow_event.js`

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `event_names` | `Object` | Workflow event name constants |

*Inherits all properties from [Event](Event.md)*

## Constructor

### `constructor()`

Creates a new WorkflowEvent instance and registers all workflow events.

## Methods

### `registerWorkflowEvents()`

Registers all workflow event names defined in the workflow_event_names enum.

**Returns:** `void`

*Inherits all methods from [Event](Event.md)*

## Workflow Event Names

- `WORKFLOW_CREATED` - Fired when a workflow is created
- `WORKFLOW_STARTED` - Fired when workflow execution begins
- `WORKFLOW_COMPLETED` - Fired when workflow completes successfully
- `WORKFLOW_ERRORED` - Fired when an error occurs during execution
- `WORKFLOW_STEP_ADDED` - Fired when a step is added
- `WORKFLOW_STEPS_ADDED` - Fired when multiple steps are added
- `WORKFLOW_STEPS_CLEARED` - Fired when all steps are cleared
- `WORKFLOW_STEP_MOVED` - Fired when a step is moved
- `WORKFLOW_STEP_REMOVED` - Fired when a step is removed
- `WORKFLOW_STEP_SHIFTED` - Fired when a step is shifted

## Usage Example

```javascript
import { Workflow, ActionStep } from './classes';

const workflow = new Workflow([], 'My Workflow');

// Listen to workflow events
workflow.events.on(workflow.events.event_names.WORKFLOW_STARTED, (data) => {
  console.log('Workflow started:', data.workflow.name);
});

workflow.events.on(workflow.events.event_names.WORKFLOW_COMPLETED, (data) => {
  console.log('Workflow completed:', data.workflow.name);
});

workflow.events.on(workflow.events.event_names.WORKFLOW_ERRORED, (data) => {
  console.error('Workflow error:', data.error);
});

// Add steps and execute
workflow.pushStep(new ActionStep({ 
  name: 'Step 1', 
  callable: async () => {} 
}));

await workflow.execute();
```

## Related Classes

- [Event](Event.md) - Base event class
- [Workflow](../base-classes/Workflow.md) - Uses WorkflowEvent for lifecycle events
