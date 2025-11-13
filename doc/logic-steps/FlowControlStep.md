# FlowControlStep

**Represents a flow control step that can break or continue loops based on conditions.**

## Overview

The `FlowControlStep` class provides loop control capabilities (break/continue) within workflows. It evaluates a condition and sets flags to control loop execution flow.

## Class Definition

```javascript
class FlowControlStep extends LogicStep
```

**Extends:** [LogicStep](LogicStep.md)  
**Location:** `src/classes/flow_control_step.js`

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `step_name` | `string` (static) | `'flow_control'` | Static identifier |
| `should_break` | `boolean` | `false` | Flag indicating if loop should break |
| `should_continue` | `boolean` | `false` | Flag indicating if loop should continue |
| `flow_control_type` | `string` | `flow_control_types.BREAK` | Type of flow control |

*Inherits all properties from [LogicStep](LogicStep.md)*

## Constructor

### `constructor(options)`

Creates a new FlowControlStep instance.

**Parameters:**

- `options` (Object) *[optional]* - Configuration options
  - `subject` (*) - The value to compare against
  - `operator` (string) - The comparison operator
  - `value` (*) - The value to compare the subject with
  - `flow_control_type` (string) *[optional]* - BREAK or CONTINUE (default: BREAK)
  - `name` (string) *[optional]* - The name of the step (default: `''`)

**Example:**

```javascript
import { FlowControlStep, flow_control_types } from './classes';

const breakStep = new FlowControlStep({
  name: 'Break on Error',
  subject: (context) => context.errorCount,
  operator: '>=',
  value: 3,
  flow_control_type: flow_control_types.BREAK
});
```

## Methods

### `should_breakFlow()`

Determines whether to break the loop based on the condition.

**Returns:** `Promise<boolean>` - True if loop should break

**Async:** Yes

### `should_continueFlow()`

Determines whether to continue the loop based on the condition.

**Returns:** `Promise<boolean>` - True if loop should continue

**Async:** Yes

## Usage Examples

### Break on Condition

```javascript
import { 
  LoopStep, 
  FlowControlStep, 
  Workflow, 
  ActionStep,
  flow_control_types 
} from './classes';

const loopWorkflow = new Workflow([
  new ActionStep({
    name: 'Process Item',
    callable: async (context) => {
      const item = context.items[context.index];
      if (!item.isValid) {
        context.errorCount++;
      }
      context.index++;
    }
  }),
  new FlowControlStep({
    name: 'Break on Too Many Errors',
    subject: (context) => context.errorCount,
    operator: '>=',
    value: 3,
    flow_control_type: flow_control_types.BREAK
  })
]);

const loop = new LoopStep({
  sub_workflow: loopWorkflow,
  subject: (context) => context.index < context.items.length,
  operator: '===',
  value: true
});
```

### Continue on Skip Condition

```javascript
import { 
  LoopStep, 
  FlowControlStep, 
  Workflow, 
  ActionStep,
  flow_control_types 
} from './classes';

const loopWorkflow = new Workflow([
  new ActionStep({
    name: 'Get Item',
    callable: async (context) => {
      context.currentItem = context.items[context.index];
      context.index++;
    }
  }),
  new FlowControlStep({
    name: 'Skip Invalid Items',
    subject: (context) => context.currentItem.isValid,
    operator: '===',
    value: false,
    flow_control_type: flow_control_types.CONTINUE
  }),
  new ActionStep({
    name: 'Process Valid Item',
    callable: async (context) => {
      return await processItem(context.currentItem);
    }
  })
]);
```

## Related Classes

- [LogicStep](LogicStep.md) - Base logic evaluation
- [LoopStep](LoopStep.md) - Loop execution
