# API Reference - Enums

Complete reference for all enums in Micro Flow.

## Overview

Enums provide standardized constants for step types, statuses, and other categorical values used throughout the library.

## Available Enums

### Core Enums
- **[step_types](./step-types.md)** - Types of steps (INITIATOR, ACTION, LOGIC, DELAY)
- **[step_statuses](./step-statuses.md)** - Step execution states (PENDING, RUNNING, COMPLETED, etc.)
- **[workflow_statuses](./workflow-statuses.md)** - Workflow execution states

### Event Enums
- **[step_event_names](./step-event-names.md)** - Step lifecycle event names
- **[workflow_event_names](./workflow-event-names.md)** - Workflow lifecycle event names

### Logic Step Enums
- **[logic_step_types](./logic-step-types.md)** - Types of logic-based steps
- **[sub_step_types](./sub-step-types.md)** - Mapping of class names to step identifiers
- **[conditional_step_comparators](./conditional-step-comparators.md)** - Comparison operators for conditional steps
- **[loop_types](./loop-types.md)** - Loop iteration strategies (WHILE, FOR_EACH)
- **[flow_control_types](./flow-control-types.md)** - Flow control operations (BREAK, CONTINUE)

### Delay Enums
- **[delay_types](./delay-types.md)** - Delay timing strategies (ABSOLUTE, RELATIVE)

## Import Examples

```javascript
// Import specific enums
import {
  StepTypes,
  StepStatuses,
  WorkflowStatuses,
  DelayTypes,
  LoopTypes,
  ConditionalStepComparators,
  FlowControlTypes,
  LogicStepTypes,
  StepEventNames,
  WorkflowEventNames
} from 'micro-flow';

// Direct imports
import StepTypes from 'micro-flow/enums/step_types';
import StepStatuses from 'micro-flow/enums/step_statuses';
```

## Usage Example

```javascript
import { Step, StepTypes, StepStatuses } from 'micro-flow';

const step = new Step({
  name: 'My Step',
  type: StepTypes.ACTION,  // Using enum constant
  callable: async () => {
    // ... step logic
  }
});

await step.execute();

// Check step status using enum
if (step.state.get('status') === StepStatuses.COMPLETED) {
  console.log('Step completed successfully');
}
```

## See Also

- [Classes Reference](../classes/index.md)
- [Helpers Reference](../helpers/index.md)
