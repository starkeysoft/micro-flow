# logic_step_types

Sub-type identifiers for the various `LogicStep` subclasses. Used internally to categorize step behavior. Complements the more granular [`sub_step_types`](sub_step_types.md) enum.

## Table of Contents
- [Values](#values)
- [Usage](#usage)
- [Related](#related)

## Values

| Key | Value | Description |
|-----|-------|-------------|
| `CONDITIONAL` | `'conditional'` | Identifies a `ConditionalStep`. |
| `LOOP` | `'loop'` | Identifies a `LoopStep`. |
| `FLOW_CONTROL` | `'flow_control'` | Identifies a `FlowControlStep`. |
| `SWITCH` | `'switch'` | Identifies a `SwitchStep`. |
| `SKIP` | `'skip'` | Internal skip marker type. |

## Usage

```javascript
import { logic_step_types } from '@ronaldroe/micro-flow';

console.log(logic_step_types.CONDITIONAL);  // 'conditional'
console.log(logic_step_types.LOOP);         // 'loop'
console.log(logic_step_types.FLOW_CONTROL); // 'flow_control'
console.log(logic_step_types.SWITCH);       // 'switch'
```

Checking step sub-type at runtime:

```javascript
import { ConditionalStep, FlowControlStep, logic_step_types } from '@ronaldroe/micro-flow';

const step = new ConditionalStep({
  name: 'check',
  conditional: { subject: true, operator: '===', value: true },
  true_callable: async () => 'yes',
  false_callable: async () => 'no',
});

// sub_step_type is set on the instance
console.log(step.sub_step_type); // 'conditional'
console.log(step.sub_step_type === logic_step_types.CONDITIONAL); // true
```

## Related

- [sub_step_types](sub_step_types.md) — Maps class names to their `step_name` strings.
- [LogicStep](../classes/steps/logic_step.md) — Base class for all conditional step types.
- [ConditionalStep](../classes/steps/conditional_step.md) — `CONDITIONAL` type.
- [FlowControlStep](../classes/steps/flow_control_step.md) — `FLOW_CONTROL` type.
- [LoopStep](../classes/steps/loop_step.md) — `LOOP` type.
- [SwitchStep](../classes/steps/switch_step.md) — `SWITCH` type.
