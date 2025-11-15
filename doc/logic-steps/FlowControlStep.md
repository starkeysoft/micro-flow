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
| `flow_control_type` | `string` | `flow_control_types.BREAK` | Type of flow control ('break' or 'continue') |
| `should_break` | `boolean` | `false` | Flag indicating if loop should break |
| `should_continue` | `boolean` | `false` | Flag indicating if loop should continue |

*Inherits all properties from [LogicStep](LogicStep.md)*

## Constructor

### `constructor(options)`

Creates a new FlowControlStep instance.

**Parameters:**

- `options` (Object) *[optional]* - Configuration options
  - `subject` (*) - The value to compare against
  - `operator` (string) - The comparison operator
  - `value` (*) - The value to compare the subject with
  - `flow_control_type` (string) *[optional]* - The type of flow control from flow_control_types enum: 'break' or 'continue' (default: `'break'`)
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

### `shouldBreakFlow()`

Determines whether to break the loop based on the condition.

**Returns:** `Promise<boolean>` - True if the loop should break, false otherwise

**Async:** Yes

---

### `shouldContinueFlow()`

Determines whether to continue the loop based on the condition.

**Returns:** `Promise<boolean>` - True if the loop should continue, false otherwise

**Async:** Yes

## Usage Examples

### Break on Condition

```javascript
import { 
  LoopStep, 
  FlowControlStep, 
  Workflow, 
  Step,
  step_types
} from './classes';

const loopWorkflow = new Workflow([
  new Step({
    name: 'Process Item',
    type: step_types.ACTION,
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
    value: 3
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
  Step,
  step_types
} from './classes';

const loopWorkflow = new Workflow([
  new Step({
    name: 'Get Item',
    type: step_types.ACTION,
    callable: async (context) => {
      context.currentItem = context.items[context.index];
      context.index++;
    }
  }),
  new FlowControlStep({
    name: 'Skip Invalid Items',
    subject: (context) => context.currentItem.isValid,
    operator: '===',
    value: false
  }),
  new Step({
    name: 'Process Valid Item',
    type: step_types.ACTION,
    callable: async (context) => {
      return await processItem(context.currentItem);
    }
  })
]);
```

## Related Classes

- [LogicStep](LogicStep.md) - Base logic evaluation
- [LoopStep](LoopStep.md) - Loop execution
