# logic_step_types Enum

Defines the five specialized logic step types used for flow control in workflows.

## Values

| Constant | Value | Description |
|----------|-------|-------------|
| `CONDITIONAL` | `'conditional'` | If/else branching based on conditions |
| `LOOP` | `'loop'` | Iteration over collections or while conditions |
| `FLOW_CONTROL` | `'flow_control'` | Break/continue operations in loops |
| `SWITCH` | `'switch'` | Multi-way branching with case matching |
| `SKIP` | `'skip'` | Conditional skipping of next step |

## Import

```javascript
import { LogicStepTypes } from 'micro-flow';
// or
import LogicStepTypes from 'micro-flow/enums/logic_step_types';
```

## Overview

Logic step types are automatically assigned to specialized step classes. These steps inherit from `LogicStep` and have their `type` set to `StepTypes.LOGIC` and a specific `step_name` from this enum.

## Mapping to Classes

| Logic Step Type | Class | Purpose |
|----------------|-------|---------|
| `CONDITIONAL` | ConditionalStep | If/else branching |
| `LOOP` | LoopStep | While/for-each iteration |
| `FLOW_CONTROL` | FlowControlStep | Break/continue in loops |
| `SWITCH` | SwitchStep | Multi-case branching |
| `SKIP` | SkipStep | Skip next step conditionally |

## Usage

### CONDITIONAL

Branch execution based on true/false conditions.

```javascript
import { ConditionalStep, LogicStepTypes } from 'micro-flow';

const conditional = new ConditionalStep({
  name: 'Check Auth',
  // step_name automatically set to LogicStepTypes.CONDITIONAL
  callable: async function() {
    return this.workflow.userRole === 'admin';
  },
  if_true_steps: [
    new Step({
      name: 'Admin Action',
      type: StepTypes.ACTION,
      callable: async () => performAdminAction()
    })
  ],
  if_false_steps: [
    new Step({
      name: 'User Action',
      type: StepTypes.ACTION,
      callable: async () => performUserAction()
    })
  ]
});

await conditional.execute();
```

### LOOP

Iterate with while or for-each patterns.

```javascript
import { LoopStep, LogicStepTypes, LoopTypes } from 'micro-flow';

const loop = new LoopStep({
  name: 'Process Items',
  // step_name automatically set to LogicStepTypes.LOOP
  loop_type: LoopTypes.FOR_EACH,
  callable: async function() {
    return this.workflow.items;
  },
  loop_steps: [
    new Step({
      name: 'Process',
      type: StepTypes.ACTION,
      callable: async (item) => processItem(item)
    })
  ]
});

await loop.execute();
```

### FLOW_CONTROL

Control loop execution with break or continue.

```javascript
import { FlowControlStep, LogicStepTypes, FlowControlTypes } from 'micro-flow';

const flowControl = new FlowControlStep({
  name: 'Break on Found',
  // step_name automatically set to LogicStepTypes.FLOW_CONTROL
  flow_control_type: FlowControlTypes.BREAK,
  callable: async function(data) {
    return data.found === true;
  }
});

// Used within a loop
const loop = new LoopStep({
  name: 'Search',
  loop_type: LoopTypes.FOR_EACH,
  callable: async function() {
    return this.workflow.items;
  },
  loop_steps: [
    new Step({
      name: 'Check',
      type: StepTypes.ACTION,
      callable: async (item) => ({ found: item.id === targetId })
    }),
    flowControl // Breaks loop if found
  ]
});

await loop.execute();
```

### SWITCH

Multi-way branching with case matching.

```javascript
import { SwitchStep, Case, LogicStepTypes } from 'micro-flow';

const switchStep = new SwitchStep({
  name: 'Route by Type',
  // step_name automatically set to LogicStepTypes.SWITCH
  callable: async function() {
    return this.workflow.requestType;
  },
  cases: [
    new Case({
      name: 'GET',
      callable: async (value) => value === 'GET',
      case_steps: [
        new Step({
          name: 'Handle GET',
          type: StepTypes.ACTION,
          callable: async () => handleGet()
        })
      ]
    }),
    new Case({
      name: 'POST',
      callable: async (value) => value === 'POST',
      case_steps: [
        new Step({
          name: 'Handle POST',
          type: StepTypes.ACTION,
          callable: async () => handlePost()
        })
      ]
    })
  ],
  default_steps: [
    new Step({
      name: 'Handle Other',
      type: StepTypes.ACTION,
      callable: async () => handleOther()
    })
  ]
});

await switchStep.execute();
```

### SKIP

Conditionally skip the next step in workflow.

```javascript
import { SkipStep, LogicStepTypes } from 'micro-flow';

const skipStep = new SkipStep({
  name: 'Skip if Cached',
  // step_name automatically set to LogicStepTypes.SKIP
  callable: async function() {
    return this.workflow.isCached === true; // Skip if true
  }
});

workflow.pushSteps([
  new Step({
    name: 'Check Cache',
    type: StepTypes.ACTION,
    callable: async function() {
      const cached = await checkCache('data');
      this.workflow.isCached = !!cached;
      return cached;
    }
  }),
  skipStep,
  new Step({
    name: 'Fetch Data', // Skipped if cache exists
    type: StepTypes.ACTION,
    callable: async () => fetchFromAPI()
  })
]);

await workflow.execute();
```

## Type Checking

```javascript
// Check if a step is a logic step
if (step.state.get('type') === StepTypes.LOGIC) {
  const logicType = step.constructor.step_name;
  
  if (logicType === LogicStepTypes.CONDITIONAL) {
    console.log('This is a conditional step');
  } else if (logicType === LogicStepTypes.LOOP) {
    console.log('This is a loop step');
  }
}
```

## Complete Workflow Example

```javascript
import {
  Workflow,
  Step,
  ConditionalStep,
  LoopStep,
  SwitchStep,
  SkipStep,
  FlowControlStep,
  StepTypes,
  LoopTypes,
  FlowControlTypes
} from 'micro-flow';

const workflow = new Workflow({ name: 'Complex Logic' });

workflow.pushSteps([
  // SKIP: Skip initialization if already done
  new SkipStep({
    name: 'Skip Init',
    callable: async function() {
      return this.workflow.initialized === true;
    }
  }),
  
  new Step({
    name: 'Initialize',
    type: StepTypes.ACTION,
    callable: async function() {
      this.workflow.initialized = true;
      return { initialized: true };
    }
  }),
  
  // CONDITIONAL: Choose data source
  new ConditionalStep({
    name: 'Use Cache or API',
    callable: async function() {
      return this.workflow.useCache === true;
    },
    if_true_steps: [
      new Step({
        name: 'Load from Cache',
        type: StepTypes.ACTION,
        callable: async () => loadFromCache()
      })
    ],
    if_false_steps: [
      new Step({
        name: 'Fetch from API',
        type: StepTypes.ACTION,
        callable: async () => fetchFromAPI()
      })
    ]
  }),
  
  // LOOP: Process each item
  new LoopStep({
    name: 'Process Items',
    loop_type: LoopTypes.FOR_EACH,
    callable: async function() {
      return this.workflow.output_data[1].result;
    },
    loop_steps: [
      // FLOW_CONTROL: Skip invalid items
      new FlowControlStep({
        name: 'Skip Invalid',
        flow_control_type: FlowControlTypes.CONTINUE,
        callable: async (item) => !item.valid
      }),
      
      // SWITCH: Route by item type
      new SwitchStep({
        name: 'Route by Type',
        callable: async (item) => item.type,
        cases: [
          new Case({
            name: 'Type A',
            callable: async (type) => type === 'A',
            case_steps: [
              new Step({
                name: 'Process A',
                type: StepTypes.ACTION,
                callable: async (item) => processTypeA(item)
              })
            ]
          }),
          new Case({
            name: 'Type B',
            callable: async (type) => type === 'B',
            case_steps: [
              new Step({
                name: 'Process B',
                type: StepTypes.ACTION,
                callable: async (item) => processTypeB(item)
              })
            ]
          })
        ]
      })
    ]
  })
]);

await workflow.execute();
```

## Benefits of Logic Step Types

1. **Type Safety:** Clear categorization of control flow operations
2. **Debugging:** Easy identification of logic steps in workflow
3. **Serialization:** Proper reconstruction of workflows from JSON
4. **Documentation:** Self-documenting workflow structure
5. **Tooling:** IDE support and type checking

## See Also

- [LogicStep Class](../classes/logic-step.md)
- [ConditionalStep Class](../classes/conditional-step.md)
- [LoopStep Class](../classes/loop-step.md)
- [SwitchStep Class](../classes/switch-step.md)
- [FlowControlStep Class](../classes/flow-control-step.md)
- [SkipStep Class](../classes/skip-step.md)
- [step_types Enum](./step-types.md)
