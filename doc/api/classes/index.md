# API Reference - Classes

Complete API reference for all classes in Micro Flow.

## Core Classes

### Workflow Management
- **[Workflow](./workflow.md)** - Main workflow orchestration class
- **[State](./state.md)** - State management for workflows and steps

### Step Classes
- **[Step](./step.md)** - Base step class for all workflow steps
- **[LogicStep](./logic-step.md)** - Base class for logic-based steps

### Specialized Step Types
- **[DelayStep](./delay-step.md)** - Time-based delay steps
- **[ConditionalStep](./conditional-step.md)** - Conditional branching steps
- **[LoopStep](./loop-step.md)** - Loop execution steps
- **[SwitchStep](./switch-step.md)** - Multi-way branching steps
- **[FlowControlStep](./flow-control-step.md)** - Break/continue flow control
- **[SkipStep](./skip-step.md)** - Conditional skip steps
- **[Case](./case.md)** - Case statements for switch steps

### Event Classes
- **[Event](./event.md)** - Base event handling class
- **[StepEvent](./step-event.md)** - Step-specific event management
- **[WorkflowEvent](./workflow-event.md)** - Workflow-specific event management

## Class Hierarchy

```
Event (extends EventTarget)
├── StepEvent
└── WorkflowEvent

State
└── WorkflowState (used by Workflow)

Step
├── LogicStep
│   ├── ConditionalStep
│   ├── LoopStep
│   ├── SwitchStep
│   ├── FlowControlStep
│   └── SkipStep
├── DelayStep
└── Case (extends LogicStep)

Workflow
```

## Import Examples

```javascript
// Core classes
import { Workflow, Step, State } from 'micro-flow';

// Specialized steps
import { 
  DelayStep,
  ConditionalStep,
  LoopStep,
  SwitchStep,
  FlowControlStep,
  SkipStep,
  Case
} from 'micro-flow';

// Event classes
import { Event, StepEvent, WorkflowEvent } from 'micro-flow';

// Direct imports
import Workflow from 'micro-flow/classes/workflow';
import Step from 'micro-flow/classes/step';
```

## See Also

- [Enums Reference](../enums/index.md)
- [Helpers Reference](../helpers/index.md)
- [Core Concepts](../../core-concepts/workflows.md)
