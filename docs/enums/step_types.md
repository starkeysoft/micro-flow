# step_types

High-level semantic category for `Step` instances. Set via `options.step_type` in the `Step` constructor. Used internally for classification and can be used in application logic to filter or route steps.

## Table of Contents
- [Values](#values)
- [Usage](#usage)
- [Related](#related)

## Values

| Key | Value | Description |
|-----|-------|-------------|
| `ACTION` | `'action'` | A standard executable step. Default for all plain `Step` instances. |
| `DELAY` | `'delay'` | A step that introduces a timed pause. Used by `DelayStep`. |
| `LOGIC` | `'logic'` | A step containing conditional logic. Used by `LogicStep` and its subclasses. |
| `LOOP` | `'loop'` | A step that iterates over a collection or condition. Used by `LoopStep`. |

## Usage

```javascript
import { Step, step_types } from '@ronaldroe/micro-flow';

const actionStep = new Step({
  name: 'fetch-data',
  step_type: step_types.ACTION,
  callable: async () => ({ data: [] }),
});

console.log(actionStep.step_type); // 'action'

// Inspecting step types in a workflow
import { Workflow } from '@ronaldroe/micro-flow';

const wf = new Workflow({
  name: 'mixed-pipeline',
  steps: [
    new Step({ name: 'a', step_type: step_types.ACTION, callable: async () => {} }),
  ],
});

const actionSteps = wf.steps.filter(s => s.step_type === step_types.ACTION);
console.log(`${actionSteps.length} action step(s)`);
```

The `step_type` is set automatically by subclasses:

```javascript
import { DelayStep, LoopStep, ConditionalStep, step_types, loop_types } from '@ronaldroe/micro-flow';

const delay = new DelayStep({ name: 'd', relative_delay_ms: 100 });
console.log(delay.step_type); // 'delay'

const loop = new LoopStep({ name: 'l', loop_type: loop_types.FOR, iterations: 3, callable: async () => {} });
console.log(loop.step_type); // 'loop'

const cond = new ConditionalStep({
  name: 'c',
  conditional: { subject: true, operator: '===', value: true },
  true_callable: async () => {},
  false_callable: async () => {},
});
console.log(cond.step_type); // 'logic'
```

## Related

- [Step](../classes/steps/step.md) — Accepts `step_type` in its constructor.
- [sub_step_types](sub_step_types.md) — More granular classification of step subclasses.
- [DelayStep](../classes/steps/delay_step.md) — Uses `DELAY` type.
- [LogicStep](../classes/steps/logic_step.md) — Uses `LOGIC` type.
- [LoopStep](../classes/steps/loop_step.md) — Uses `LOOP` type.
