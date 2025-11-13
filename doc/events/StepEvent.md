# StepEvent

**Manages step-specific events by extending the base Event class.**

## Overview

The `StepEvent` class provides event management for step lifecycle events. It automatically registers all step-related event names.

## Class Definition

```javascript
class StepEvent extends Event
```

**Extends:** [Event](Event.md)  
**Location:** `src/classes/step_event.js`

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `event_names` | `Object` | Step event name constants |

*Inherits all properties from [Event](Event.md)*

## Constructor

### `constructor()`

Creates a new StepEvent instance and registers all step events.

## Methods

### `registerStepEvents()`

Registers all step event names defined in the step_event_names enum.

**Returns:** `void`

*Inherits all methods from [Event](Event.md)*

## Step Event Names

- `STEP_COMPLETED` - Fired when a step completes successfully
- `STEP_FAILED` - Fired when a step fails
- `STEP_WAITING` - Fired when a step enters waiting state
- `STEP_PENDING` - Fired when a step enters pending state
- `STEP_RUNNING` - Fired when a step starts running

## Usage Example

```javascript
import { Step, step_types } from './classes';

const step = new Step({
  name: 'My Step',
  type: step_types.ACTION,
  callable: async () => {}
});

// Listen to step events
step.events.on(step.events.event_names.STEP_COMPLETED, (data) => {
  console.log('Step completed:', data.step.name);
});

step.events.on(step.events.event_names.STEP_FAILED, (data) => {
  console.error('Step failed:', data.error);
});

await step.execute();
```

## Related Classes

- [Event](Event.md) - Base event class
- [Step](../base-classes/Step.md) - Uses StepEvent for lifecycle events
