# sub_step_types

Granular type identifiers for each step subclass. Maps the class name to its `step_name` string, which is also the value stored in each instance's `sub_step_type` property.

## Table of Contents
- [Values](#values)
- [Usage](#usage)
- [Related](#related)

## Values

| Key (class name) | Value (`step_name`) | Description |
|-----------------|---------------------|-------------|
| `Step` | `'step'` | Base `Step` class. |
| `LogicStep` | `'logic'` | Base conditional logic class. |
| `ConditionalStep` | `'conditional'` | Two-branch conditional step. |
| `FlowControlStep` | `'flow_control'` | Break/skip flow control step. |
| `LoopStep` | `'loop'` | Iteration step. |
| `SwitchStep` | `'switch'` | Multi-case switch step. |
| `Case` | `'case'` | Single case for a `SwitchStep`. |
| `DelayStep` | `'delay'` | Timed delay step. |

## Usage

```javascript
import { sub_step_types } from '@ronaldroe/micro-flow';

console.log(sub_step_types.ConditionalStep); // 'conditional'
console.log(sub_step_types.LoopStep);        // 'loop'
console.log(sub_step_types.DelayStep);       // 'delay'
console.log(sub_step_types.FlowControlStep); // 'flow_control'
```

Each step class exposes a static `step_name` property that matches the corresponding enum value:

```javascript
import { Step, ConditionalStep, LoopStep, sub_step_types } from '@ronaldroe/micro-flow';

console.log(Step.step_name);            // 'step'
console.log(ConditionalStep.step_name); // 'conditional'
console.log(LoopStep.step_name);        // 'loop'
```

Inspecting a step's sub-type at runtime:

```javascript
import { ConditionalStep, sub_step_types } from '@ronaldroe/micro-flow';

const step = new ConditionalStep({
  name: 'my-branch',
  conditional: { subject: true, operator: '===', value: true },
  true_callable: async () => 'yes',
  false_callable: async () => 'no',
});

console.log(step.sub_step_type);  // 'conditional'
console.log(step.sub_step_type === sub_step_types.ConditionalStep); // true

// Filter steps in a workflow by sub-type
import { Workflow, Step } from '@ronaldroe/micro-flow';
const wf = new Workflow({ name: 'mixed' });
// ...add steps...
const conditionals = wf.steps.filter(s => s.sub_step_type === sub_step_types.ConditionalStep);
```

## Related

- [step_types](step_types.md) — Higher-level category (`action`, `delay`, `logic`, `loop`).
- [logic_step_types](logic_step_types.md) — Sub-types specific to logic steps.
- [Step](../classes/steps/step.md) — Base class; `step_name = 'step'`.
- [ConditionalStep](../classes/steps/conditional_step.md) — `step_name = 'conditional'`.
- [FlowControlStep](../classes/steps/flow_control_step.md) — `step_name = 'flow_control'`.
- [LoopStep](../classes/steps/loop_step.md) — `step_name = 'loop'`.
- [SwitchStep](../classes/steps/switch_step.md) — `step_name = 'switch'`.
- [Case](../classes/steps/case.md) — `step_name = 'case'`.
- [DelayStep](../classes/steps/delay_step.md) — `step_name = 'delay'`.
